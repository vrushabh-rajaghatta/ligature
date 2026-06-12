



import { useState, useMemo, useEffect } from 'react';
import {
  Microscope, FlaskConical, Activity, Beaker, FileText, CheckCircle,
  Clock, AlertTriangle, ChevronRight, Search, Filter, TrendingUp,
  Link2, ExternalLink, Eye, Target, Brain, Rat, Dog, TestTube2,
  AlertCircle, BarChart3, Layers, Building2
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { FilterState } from '@/components/layout/FilterBar';
import {
  nonclinicalStudies, nonclinicalSummaries,
  NonclinicalStudy, NonclinicalStudyStatus, NonclinicalStudyType,
  STUDY_TYPE_LABELS, STUDY_TYPE_CTD_MAPPING, SPECIES_LABELS,
  getStudiesByProduct, getSummariesByProduct, getStudyCategoryStats,
  getNonclinicalPackageReadiness, getStudiesWithPredictions
} from '@/data/nonclinical-data';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Progress';
import { SearchInput } from '@/components/ui/Input';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { StatCardGridSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { NonclinicalSummaryGenerator } from '@/components/nonclinical/NonclinicalSummaryGenerator';
import { useCascadeEngine } from '@/store/useCascadeEngine';
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import { useToast } from '@/components/ui/Toast';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useProductFilter } from '@/hooks/useProductFilter';
import { useAppStore } from '@/store/useAppStore';

// ============================================================================
// TYPES
// ============================================================================

interface NonclinicalScreenProps {
  filters?: FilterState;
}

type ViewMode = 'dashboard' | 'studies' | 'summaries' | 'predictions';
type StudyCategory = 'all' | 'pharmacology' | 'pk' | 'toxicology';

// ============================================================================
// COLOR MAPS
// ============================================================================

const statusColorMap: Record<NonclinicalStudyStatus, BadgeColor> = {
  'planned': 'slate',
  'in-progress': 'blue',
  'data-review': 'amber',
  'report-drafting': 'purple',
  'qc-review': 'teal',
  'finalized': 'green',
  'submitted': 'emerald',
};

const statusLabels: Record<NonclinicalStudyStatus, string> = {
  'planned': 'Planned',
  'in-progress': 'In Progress',
  'data-review': 'Data Review',
  'report-drafting': 'Report Drafting',
  'qc-review': 'QC Review',
  'finalized': 'Finalized',
  'submitted': 'Submitted',
};

const categoryColorMap: Record<string, BadgeColor> = {
  'pharmacology': 'purple',
  'pk': 'blue',
  'toxicology': 'red',
};

const glpColorMap: Record<string, BadgeColor> = {
  'glp': 'green',
  'non-glp': 'slate',
  'glp-like': 'amber',
};

const summaryStatusColorMap: Record<string, BadgeColor> = {
  'not-started': 'slate',
  'drafting': 'blue',
  'review': 'amber',
  'finalized': 'green',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStudyCategory = (type: NonclinicalStudyType): 'pharmacology' | 'pk' | 'toxicology' => {
  if (type.startsWith('pharmacology-')) return 'pharmacology';
  if (type.startsWith('pk-')) return 'pk';
  return 'toxicology';
};

const getSpeciesIcon = (species: string) => {
  switch (species) {
    case 'rat':
    case 'mouse':
      return <Rat className="w-4 h-4" />;
    case 'dog':
      return <Dog className="w-4 h-4" />;
    case 'in-vitro':
      return <TestTube2 className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function NonclinicalScreen({ filters }: NonclinicalScreenProps) {
    const { deadClick } = useDeadClick();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<StudyCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudy, setSelectedStudy] = useState<NonclinicalStudy | null>(null);
  const toast = useToast();
  const fireTrigger = useCascadeEngine(s => s.fireTrigger);
  const emitEvent = useCrossModuleEventStore(s => s.emitEvent);
  const [finalizedStudyIds, setFinalizedStudyIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);
  
  // Filter studies by global product filter
  const { selectedProductId } = useProductFilter();
  const productId = selectedProductId ?? 'lig-2847';
  
  const filteredStudies = useMemo(() => {
    let studies = getStudiesByProduct(productId);
    
    if (selectedCategory !== 'all') {
      studies = studies.filter(s => getStudyCategory(s.type) === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      studies = studies.filter(s =>
        s.studyNumber.toLowerCase().includes(query) ||
        s.title.toLowerCase().includes(query) ||
        STUDY_TYPE_LABELS[s.type].toLowerCase().includes(query)
      );
    }
    
    return studies;
  }, [productId, selectedCategory, searchQuery]);
  
  const summaries = useMemo(() => getSummariesByProduct(productId), [productId]);
  const categoryStats = useMemo(() => getStudyCategoryStats(productId), [productId]);
  const packageReadiness = useMemo(() => getNonclinicalPackageReadiness(productId), [productId]);
  const predictiveStudies = useMemo(() => getStudiesWithPredictions(), []);
  
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <StatCardGridSkeleton count={4} />
        <TableSkeleton rows={6} />
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader
        moduleId="nonclinical"
          showAssetContext
        title="Nonclinical Studies"
        subtitle="Pharmacology, pharmacokinetics, toxicology, and IND package readiness"
        icon={<Microscope className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            {(['dashboard', 'studies', 'summaries', 'predictions'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  viewMode === mode
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        }
      />
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Dashboard View */}
        {viewMode === 'dashboard' && (
          <div className="space-y-4 md:space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <StatCard
                title="Total Studies"
                value={nonclinicalStudies.filter(s => s.productId === productId).length}
                subtitle={`${packageReadiness.studies.completed} finalized`}
                icon={<Microscope className="w-5 h-5" />}
                trend={{ value: packageReadiness.overallProgress, direction: 'up', label: '% complete' }}
              />
              <StatCard
                title="Pharmacology"
                value={categoryStats.pharmacology.total}
                subtitle={`${categoryStats.pharmacology.completed} complete`}
                icon={<FlaskConical className="w-5 h-5" />}
                accentColor="purple"
              />
              <StatCard
                title="Pharmacokinetics"
                value={categoryStats.pharmacokinetics.total}
                subtitle={`${categoryStats.pharmacokinetics.completed} complete`}
                icon={<Activity className="w-5 h-5" />}
                accentColor="blue"
              />
              <StatCard
                title="Toxicology"
                value={categoryStats.toxicology.total}
                subtitle={`${categoryStats.toxicology.completed} complete`}
                icon={<AlertTriangle className="w-5 h-5" />}
                accentColor="red"
              />
            </div>
            
            {/* Package Readiness */}
            <Card>
              <CardHeader
                title="Nonclinical Package Readiness"
                subtitle="Progress toward IND/NDA nonclinical submission package"
                icon={<Target className="w-5 h-5 text-accent-green" />}
              />
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">Study Reports (Module 4)</span>
                      <span className="text-sm font-medium text-text-primary">
                        {packageReadiness.studies.completed}/{packageReadiness.studies.total}
                      </span>
                    </div>
                    <ProgressBar 
                      value={(packageReadiness.studies.completed / packageReadiness.studies.total) * 100} 
                      color="blue" 
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">Summaries (Module 2.6)</span>
                      <span className="text-sm font-medium text-text-primary">
                        {packageReadiness.summaries.completed}/{packageReadiness.summaries.total}
                      </span>
                    </div>
                    <ProgressBar 
                      value={(packageReadiness.summaries.completed / packageReadiness.summaries.total) * 100} 
                      color="purple" 
                    />
                  </div>
                </div>
                
                {/* Overall readiness */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">Overall Package Readiness</span>
                    <Badge color={packageReadiness.ready ? 'green' : 'amber'}>
                      {packageReadiness.overallProgress}%
                    </Badge>
                  </div>
                  <ProgressBar value={packageReadiness.overallProgress} color="green" size="lg" />
                </div>
              </CardContent>
            </Card>
            
            {/* CTD Module 4 Structure */}
            <Card>
              <CardHeader
                title="CTD Module 4 - Nonclinical Study Reports"
                subtitle="Studies mapped to eCTD sections"
                icon={<Layers className="w-5 h-5 text-accent-purple" />}
                action={
                  <Button variant="ghost" size="sm" onClick={() => setViewMode('studies')}>
                    View All <ChevronRight className="w-4 h-4" />
                  </Button>
                }
              />
              <CardContent>
                <div className="space-y-3">
                  {[
                    { section: '4.2.1', name: 'Pharmacology', count: categoryStats.pharmacology.total, complete: categoryStats.pharmacology.completed, color: 'purple' },
                    { section: '4.2.2', name: 'Pharmacokinetics', count: categoryStats.pharmacokinetics.total, complete: categoryStats.pharmacokinetics.completed, color: 'blue' },
                    { section: '4.2.3', name: 'Toxicology', count: categoryStats.toxicology.total, complete: categoryStats.toxicology.completed, color: 'red' },
                  ].map(item => (
                    <div 
                      key={item.section}
                      className="flex items-center gap-4 p-3 bg-surface-card rounded-lg hover:bg-surface transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedCategory(item.section === '4.2.1' ? 'pharmacology' : item.section === '4.2.2' ? 'pk' : 'toxicology');
                        setViewMode('studies');
                      }}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-accent-${item?.color ?? ''}/10`}>
                        <span className={`text-sm font-bold text-accent-${item?.color ?? ''}`}>{item.section}</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{item.name}</div>
                        <div className="text-xs text-text-muted">{item.count} studies</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={item.complete === item.count ? 'green' : 'amber'} size="xs">
                          {item.complete}/{item.count}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Predictive Safety Signals */}
            {predictiveStudies.length > 0 && (
              <Card>
                <CardHeader
                  title="Translational Safety Predictions"
                  subtitle="Nonclinical findings with predicted clinical relevance"
                  icon={<Brain className="w-5 h-5 text-accent-amber" />}
                />
                <CardContent>
                  <div className="space-y-3">
                    {predictiveStudies.map(study => (
                      <div 
                        key={study.id}
                        className="p-4 bg-accent-amber/5 border border-accent-amber/20 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <AlertTriangle className="w-4 h-4 text-accent-amber" />
                              <span className="text-sm font-medium text-text-primary">
                                {study.predictedClinicalSignal?.signalType}
                              </span>
                              <Badge color="amber" size="xs">
                                {study.predictedClinicalSignal?.probability}% probability
                              </Badge>
                            </div>
                            <p className="text-xs text-text-muted mb-2">
                              From: {study.studyNumber} - {study.title}
                            </p>
                            <p className="text-sm text-text-secondary">
                              {study.predictedClinicalSignal?.rationale}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => toast.success('Nonclinical record updated — ICH M3(R2) audit trail stamped')}>
                            <Link2 className="w-4 h-4" />
                            View Study
                          </Button>
                        </div>
                        {study.predictedClinicalSignal?.monitoringRecommendation && (
                          <div className="mt-3 pt-3 border-t border-accent-amber/20 flex items-start gap-2">
                            <Target className="w-4 h-4 text-accent-green mt-0.5" />
                            <div>
                              <span className="text-xs font-medium text-accent-green">Clinical Monitoring:</span>
                              <p className="text-xs text-text-muted">
                                {study.predictedClinicalSignal.monitoringRecommendation}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        {/* Studies View */}
        {viewMode === 'studies' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search studies..."
                className="w-64"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as StudyCategory)}
                className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
              >
                <option value="all">All Categories</option>
                <option value="pharmacology">Pharmacology</option>
                <option value="pk">Pharmacokinetics</option>
                <option value="toxicology">Toxicology</option>
              </select>
              <div className="flex-1" />
              <span className="text-sm text-text-muted">
                {filteredStudies.length} studies
              </span>
            </div>
            
            {/* Studies Table */}
            <div className="bg-surface-elevated rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-card/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Study</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Species</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">GLP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">CTD Section</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Progress</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudies.map(study => (
                    <tr 
                      key={study.id}
                      className="hover:bg-surface-card/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedStudy(study)}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-text-primary">{study.studyNumber}</div>
                        <div className="text-xs text-text-muted truncate max-w-xs">{study.title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={categoryColorMap[getStudyCategory(study.type)]} size="xs">
                          {STUDY_TYPE_LABELS[study.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          {getSpeciesIcon(study.species)}
                          {SPECIES_LABELS[study.species]}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={glpColorMap[study.glpStatus]} size="xs">
                          {study.glpStatus.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-accent-blue">{study.ctdSection}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={statusColorMap[study.status]} size="xs">
                          {statusLabels[study.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 w-32">
                        <ProgressBar value={study.progress} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => toast.success('Nonclinical record updated — ICH M3(R2) audit trail stamped')}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Summaries View */}
        {viewMode === 'summaries' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Module 2.6 - Nonclinical Summaries</h2>
              <span className="text-sm text-text-muted">{summaries.length} documents</span>
            </div>
            
            {/* AI Document Generation */}
            <NonclinicalSummaryGenerator
              productName={'LIG-001'}
              indication="Type 2 Diabetes Mellitus"
              studies={nonclinicalStudies.map(s => ({
                id: s.id,
                studyNumber: s.studyNumber,
                title: s.title,
                species: s.species,
                duration: s.duration || 'Duration not specified',
                findings: s.keyFindings?.join('; ') || 'No significant findings',
                noael: s.noael,
                route: s.routeOfAdministration,
              }))}
              onDocumentGenerated={(content, docType) => {
                /* Document generated */
              }}
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {summaries.map(summary => (
                <Card key={summary.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-mono bg-accent-purple/10 text-accent-purple rounded">
                          {summary.ctdSection}
                        </span>
                        <Badge color={summaryStatusColorMap[summary.status]} size="xs">
                          {summary.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-text-muted">{summary.progress}%</span>
                    </div>
                    
                    <h3 className="text-sm font-medium text-text-primary mb-2">{summary.title}</h3>
                    
                    <ProgressBar value={summary.progress} size="sm" className="mb-3" />
                    
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{summary.linkedStudyIds.length} linked studies</span>
                      <span>Updated {summary.lastUpdated}</span>
                    </div>
                    
                    {/* Linked Studies */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="text-xs text-text-muted mb-2">Source Studies:</div>
                      <div className="flex flex-wrap gap-1">
                        {summary.linkedStudyIds.slice(0, 4).map(studyId => {
                          const study = nonclinicalStudies.find(s => s.id === studyId);
                          return (
                            <span 
                              key={studyId}
                              className="px-2 py-0.5 text-xs bg-surface-card rounded text-text-secondary"
                            >
                              {study?.studyNumber || studyId}
                            </span>
                          );
                        })}
                        {summary.linkedStudyIds.length > 4 && (
                          <span className="px-2 py-0.5 text-xs text-text-muted">
                            +{summary.linkedStudyIds.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {/* Predictions View */}
        {viewMode === 'predictions' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
              <Brain className="w-5 h-5 text-accent-amber" />
              <div>
                <div className="text-sm font-medium text-text-primary">Translational Predictions</div>
                <p className="text-xs text-text-muted">
                  AI-powered analysis of nonclinical findings to predict potential clinical safety signals
                </p>
              </div>
            </div>
            
            {predictiveStudies.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-text-secondary">No predictive signals identified</p>
                <p className="text-xs text-text-muted mt-1">
                  Nonclinical study findings are being analyzed for clinical relevance
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {predictiveStudies.map(study => (
                  <Card key={study.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-accent-amber/10 flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-6 h-6 text-accent-amber" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-text-primary">
                              {study.predictedClinicalSignal?.signalType}
                            </span>
                            <Badge color="amber" size="sm">
                              {study.predictedClinicalSignal?.probability}% probability
                            </Badge>
                          </div>
                          
                          <div className="text-xs text-text-muted mb-3">
                            Source:{' '}
                            <button
                              onClick={() => useAppStore.getState().setActiveModule('eln')}
                              className="text-accent-blue hover:underline inline-flex items-center gap-1"
                            >
                              {study.studyNumber} <ExternalLink className="w-3 h-3" />
                            </button>
                            {' '}- {study.title}
                          </div>
                          
                          <p className="text-sm text-text-secondary mb-3">
                            {study.predictedClinicalSignal?.rationale}
                          </p>
                          
                          {/* Nonclinical Findings */}
                          {study.keyFindings && (
                            <div className="mb-3 p-3 bg-surface-card rounded-lg">
                              <div className="text-xs font-medium text-text-secondary mb-2">Key Nonclinical Findings:</div>
                              <ul className="space-y-1">
                                {study.keyFindings.map((finding, i) => (
                                  <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                                    <CheckCircle className="w-3 h-3 text-accent-green mt-0.5 flex-shrink-0" />
                                    {finding}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Target Organs */}
                          {study.targetOrgans && (
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-text-muted">Target Organs:</span>
                              {study.targetOrgans.map(organ => (
                                <Badge key={organ} color="red" size="xs">{organ}</Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Clinical Monitoring */}
                          {study.predictedClinicalSignal?.monitoringRecommendation && (
                            <div className="p-3 bg-accent-green/5 border border-accent-green/20 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Target className="w-4 h-4 text-accent-green" />
                                <span className="text-xs font-medium text-accent-green">Recommended Clinical Monitoring</span>
                              </div>
                              <p className="text-sm text-text-primary">
                                {study.predictedClinicalSignal.monitoringRecommendation}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* CTD Links */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-text-muted mb-1">CTD Links</div>
                          <div className="space-y-1">
                            <div className="px-2 py-1 bg-surface-card rounded text-xs font-mono text-accent-purple">
                              {study.ctdSection}
                            </div>
                            {study.ctdSummarySection && (
                              <div className="px-2 py-1 bg-surface-card rounded text-xs font-mono text-accent-blue">
                                {study.ctdSummarySection}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Study Detail Panel */}
      {selectedStudy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedStudy(null)}>
          <div 
            className="bg-surface-elevated border border-border rounded-xl w-[700px] max-h-[80vh] overflow-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface-elevated">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{selectedStudy.studyNumber}</h2>
                <p className="text-sm text-text-muted">{selectedStudy.title}</p>
              </div>
              <button 
                onClick={() => setSelectedStudy(null)}
                className="p-2 hover:bg-surface-card rounded-lg"
              >
                <ChevronRight className="w-5 h-5 text-text-muted rotate-90" />
              </button>
            </div>
            
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Status and Classification */}
              <div className="flex flex-wrap gap-2">
                <Badge color={statusColorMap[selectedStudy.status]} size="sm">
                  {statusLabels[selectedStudy.status]}
                </Badge>
                <Badge color={categoryColorMap[getStudyCategory(selectedStudy.type)]} size="sm">
                  {STUDY_TYPE_LABELS[selectedStudy.type]}
                </Badge>
                <Badge color={glpColorMap[selectedStudy.glpStatus]} size="sm">
                  {selectedStudy.glpStatus.toUpperCase()}
                </Badge>
                <div className="flex items-center gap-1 px-2 py-1 bg-surface-card rounded-md">
                  {getSpeciesIcon(selectedStudy.species)}
                  <span className="text-xs text-text-secondary">{SPECIES_LABELS[selectedStudy.species]}</span>
                </div>
              </div>
              
              {/* CTD Mapping */}
              <div className="p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-4 h-4 text-accent-blue" />
                  <span className="text-sm font-medium text-text-primary">eCTD Mapping</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Module 4 Section</div>
                    <div className="text-sm font-mono text-accent-blue">{selectedStudy.ctdSection}</div>
                    <div className="text-xs text-text-muted">{STUDY_TYPE_CTD_MAPPING[selectedStudy.type]?.name}</div>
                  </div>
                  {selectedStudy.ctdSummarySection && (
                    <div>
                      <div className="text-xs text-text-muted mb-1">Summary Section</div>
                      <div className="text-sm font-mono text-accent-purple">{selectedStudy.ctdSummarySection}</div>
                      <div className="text-xs text-text-muted">Nonclinical Summary</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Study Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs text-text-muted mb-1">Route of Administration</div>
                  <div className="text-sm text-text-primary">{selectedStudy.routeOfAdministration}</div>
                </div>
                {selectedStudy.duration && (
                  <div>
                    <div className="text-xs text-text-muted mb-1">Duration</div>
                    <div className="text-sm text-text-primary">{selectedStudy.duration}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-text-muted mb-1">Principal Investigator</div>
                  <div className="text-sm text-text-primary">{selectedStudy.principalInvestigator}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">Study Director</div>
                  <div className="text-sm text-text-primary">{selectedStudy.studyDirector}</div>
                </div>
              </div>
              
              {/* Dose Groups */}
              {selectedStudy.doseGroups && (
                <div>
                  <div className="text-xs text-text-muted mb-2">Dose Groups</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudy.doseGroups.map((dose, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-surface-card rounded text-text-primary">
                        {dose}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Key Findings */}
              {selectedStudy.keyFindings && (
                <div>
                  <div className="text-xs text-text-muted mb-2">Key Findings</div>
                  <ul className="space-y-2">
                    {selectedStudy.keyFindings.map((finding, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                        <CheckCircle className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" />
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* NOAEL/LOAEL */}
              {(selectedStudy.noael || selectedStudy.loael) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 bg-surface-card rounded-lg">
                  {selectedStudy.noael && (
                    <div>
                      <div className="text-xs text-text-muted mb-1">NOAEL</div>
                      <div className="text-sm font-medium text-accent-green">{selectedStudy.noael}</div>
                    </div>
                  )}
                  {selectedStudy.loael && (
                    <div>
                      <div className="text-xs text-text-muted mb-1">LOAEL</div>
                      <div className="text-sm font-medium text-accent-amber">{selectedStudy.loael}</div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Predictive Signal */}
              {selectedStudy.predictedClinicalSignal && (
                <div className="p-4 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-accent-amber" />
                    <span className="text-sm font-medium text-text-primary">Translational Prediction</span>
                    <Badge color="amber" size="xs">
                      {selectedStudy.predictedClinicalSignal.probability}% probability
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary mb-2">
                    <strong>{selectedStudy.predictedClinicalSignal.signalType}:</strong>{' '}
                    {selectedStudy.predictedClinicalSignal.rationale}
                  </p>
                  {selectedStudy.predictedClinicalSignal.monitoringRecommendation && (
                    <div className="flex items-start gap-2 p-2 bg-accent-green/10 rounded">
                      <Target className="w-4 h-4 text-accent-green mt-0.5" />
                      <span className="text-xs text-text-primary">
                        {selectedStudy.predictedClinicalSignal.monitoringRecommendation}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSelectedStudy(null)}>Close</Button>
              <Button variant="secondary" onClick={() => toast.success('Nonclinical record updated — ICH M3(R2) audit trail stamped')}>
                <FileText className="w-4 h-4" />
                View Report
              </Button>
              {selectedStudy.glpStatus === 'glp' && !finalizedStudyIds.has(selectedStudy.id) ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    // Fire the real cascade — same as demo step frc-4
                    emitEvent(
                      'demo-glp-cascade' as any,
                      'nonclinical',
                      {
                        studyId: selectedStudy.studyNumber,
                        studyName: selectedStudy.title,
                        compound: 'LIG-2847 (Ligrastinib)',
                        keyFindings: selectedStudy.keyFindings ?? [],
                        severity: 'moderate',
                      },
                      { priority: 'high', automated: true, requiresReview: false }
                    );
                    fireTrigger({
                      type: 'glp-study-finalized',
                      sourceModule: 'nonclinical',
                      sourceId: selectedStudy.studyNumber,
                      sourceLabel: selectedStudy.title,
                      triggeredBy: 'user-action',
                      metadata: {
                        compound: 'LIG-2847 (Ligrastinib)',
                        studyId: selectedStudy.studyNumber,
                        keyFindings: selectedStudy.keyFindings ?? [],
                        severity: 'moderate',
                      },
                    });
                    setFinalizedStudyIds(prev => new Set(Array.from(prev).concat([selectedStudy.id])));
                    toast.success(`GLP study finalized — R&D cascade initiated across 6 modules`);
                    setSelectedStudy(null);
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Finalize Study
                </Button>
              ) : (
                <Button variant="primary" disabled onClick={() => toast.success('Nonclinical record updated — ICH M3(R2) audit trail stamped')}>
                  <CheckCircle className="w-4 h-4" />
                  {finalizedStudyIds.has(selectedStudy?.id ?? '') ? 'Study Finalized' : 'Open in Authoring'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NonclinicalScreen;
