



import { useState, useMemo, useEffect } from 'react';
import { FilterState } from '@/components/layout/FilterBar';
import {
  Beaker, Package, Clock, CheckCircle, AlertTriangle, TrendingUp,
  ChevronRight, Sparkles, Eye, FileText, Building2, Activity,
  BarChart3, Calendar, Thermometer, Search,
  TestTube2, Factory, Brain, Layers, Scale,
  // v0.8.1: New icons for Process Development, Formulation, Tech Transfer
  FlaskConical, GitBranch, ArrowRightLeft, Target, Microscope, Workflow,
  Lock, X, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine, Legend
} from 'recharts';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useProducts } from '@/stores/products-store';
import {
  CMCView, drugSubstances, drugProducts, batchRecords, stabilityStudies,
  analyticalMethods, manufacturingSites, processParameters,
  DrugSubstance, DrugProduct, BatchRecord, StabilityStudy, AnalyticalMethod,
  ManufacturingSite, getBatchesByProduct, getStabilityByProduct, getSiteById,
  // v0.8.1: New imports for Process Development, Formulation, Tech Transfer
  doeStudies, formulationIterations, techTransfers, scaleUpStudies,
  DOEStudy, FormulationIteration, TechTransfer, ScaleUpStudy,
  getDOEStudiesByProduct, getFormulationsByProduct, getTechTransfersByProduct,
  getScaleUpStudiesByProduct, getDOEStudyById, getEnhancedCMCStats
} from '@/data/cmc-data';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ProgressBar } from '@/components/ui/Progress';
import { StatCard } from '@/components/ui/StatCard';
// v116: Breadcrumb navigation
import { Breadcrumb } from '@/components/ui/Breadcrumb';
// v125: Card components for UI consistency
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { StatCardGridSkeleton, CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { CMCNarrativeGenerator } from '@/components/cmc/CMCNarrativeGenerator';
// v0.34.4: Smart Submissions (FDA Hybrid Documents)
import { SmartDocumentGenerator } from '@/components/smart-submissions/SmartDocumentGenerator';

// ===========================================
// CMC Color Maps (v101)
// ===========================================

// Batch status color mapping
const batchStatusColorMap: Record<string, BadgeColor> = {
  released: 'green',
  'in-progress': 'amber',
  rejected: 'red',
  stability: 'purple',
  expired: 'slate',
  pending: 'amber',
  quarantine: 'orange',
};

// Stability study status color mapping
const stabilityStatusColorMap: Record<string, BadgeColor> = {
  ongoing: 'blue',
  completed: 'green',
  terminated: 'red',
  planned: 'slate',
};

// Analytical method status color mapping
const methodStatusColorMap: Record<string, BadgeColor> = {
  validated: 'green',
  development: 'amber',
  transferred: 'purple',
  compendial: 'blue',
  retired: 'slate',
};

// Manufacturing site GMP status color mapping
const gmpStatusColorMap: Record<string, BadgeColor> = {
  approved: 'green',
  pending: 'amber',
  'under-audit': 'orange',
  'not-inspected': 'slate',
  suspended: 'red',
};

// Batch scale color mapping
const batchScaleColorMap: Record<string, BadgeColor> = {
  lab: 'slate',
  pilot: 'amber',
  registration: 'blue',
  commercial: 'green',
};

// Drug product/substance status color mapping
const productStatusColorMap: Record<string, BadgeColor> = {
  filed: 'blue',
  commercial: 'green',
  clinical: 'purple',
  development: 'amber',
  discontinued: 'red',
};

// Deviation category color mapping
const deviationCategoryColorMap: Record<string, BadgeColor> = {
  critical: 'red',
  major: 'amber',
  minor: 'slate',
};

// Timepoint status color mapping
const timepointStatusColorMap: Record<string, BadgeColor> = {
  completed: 'green',
  scheduled: 'slate',
  missed: 'red',
  'in-progress': 'blue',
};

// Test result color mapping
const testResultColorMap: Record<string, BadgeColor> = {
  pass: 'green',
  fail: 'red',
  pending: 'amber',
};

// ===========================================
// CMC Badge Helper Functions (v101)
// ===========================================

export const getBatchStatusBadge = (status: string) => {
  const color = batchStatusColorMap[status] || 'slate';
  return <Badge color={color} size="sm">{status}</Badge>;
};

export const getStabilityStatusBadge = (status: string) => {
  const color = stabilityStatusColorMap[status] || 'slate';
  return <Badge color={color} size="sm">{status}</Badge>;
};

export const getMethodStatusBadge = (status: string) => {
  const color = methodStatusColorMap[status] || 'slate';
  return <Badge color={color} size="sm">{status}</Badge>;
};

export const getGMPStatusBadge = (status: string) => {
  const color = gmpStatusColorMap[status] || 'slate';
  return <Badge color={color} size="sm">{status}</Badge>;
};

export const getBatchScaleBadge = (scale: string) => {
  const color = batchScaleColorMap[scale] || 'slate';
  return <Badge color={color} size="sm">{scale}</Badge>;
};

export const getProductStatusBadge = (status: string) => {
  const color = productStatusColorMap[status] || 'slate';
  return <Badge color={color} size="sm">{status}</Badge>;
};

export const getDeviationCategoryBadge = (category: string) => {
  const color = deviationCategoryColorMap[category] || 'slate';
  return <Badge color={color} size="sm">{category}</Badge>;
};

export const getTimepointStatusBadge = (status: string) => {
  const color = timepointStatusColorMap[status] || 'slate';
  return <Badge color={color} size="sm">{status}</Badge>;
};

export const getTestResultBadge = (result: string) => {
  const color = testResultColorMap[result] || 'slate';
  return <Badge color={color} size="sm">{result}</Badge>;
};

export const getMethodTypeBadge = (type: string) => {
  return <Badge color="blue" size="sm" className="uppercase">{type}</Badge>;
};

export const getStudyTypeBadge = (type: string) => {
  return <Badge color="purple" size="sm">{type}</Badge>;
};

interface CMCScreenProps {
  filters?: FilterState;
}

export function CMCScreen({ filters }: CMCScreenProps) {
  // Use products from store
  const products = useProducts();
  
  const [activeView, setActiveView] = useState<CMCView>('overview');
  const [selectedDrugSubstance, setSelectedDrugSubstance] = useState<DrugSubstance | null>(null);
  const [selectedDrugProduct, setSelectedDrugProduct] = useState<DrugProduct | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchRecord | null>(null);
  const [selectedStability, setSelectedStability] = useState<StabilityStudy | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<AnalyticalMethod | null>(null);
  const [selectedSite, setSelectedSite] = useState<ManufacturingSite | null>(null);
  // v0.8.1: New state for Process Dev, Formulation, Tech Transfer
  const [selectedDOE, setSelectedDOE] = useState<DOEStudy | null>(null);
  const [selectedFormulation, setSelectedFormulation] = useState<FormulationIteration | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<TechTransfer | null>(null);
  // v0.125.61: batch release e-sig state
  const [releasingBatch, setReleasingBatch] = useState<BatchRecord | null>(null);
  const [releasePin, setReleasePin] = useState('');
  const [releasePinError, setReleasePinError] = useState('');
  const [releaseStep, setReleaseStep] = useState<'confirm'|'pin'|'done'>('confirm');
  const [releasedBatchIds, setReleasedBatchIds] = useState<Set<string>>(new Set());
  // v0.125.61: analytical method detail
  const [selectedMethodDetail, setSelectedMethodDetail] = useState<AnalyticalMethod | null>(null);
  // v0.125.61: AI batch failure analysis
  const [batchAiLoading, setBatchAiLoading] = useState(false);
  const [batchAiResult, setBatchAiResult] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [substanceSearch, setSubstanceSearch] = useState('');
  const [substanceStatusFilter, setSubstanceStatusFilter] = useState<'all' | 'clinical' | 'development' | 'filed' | 'commercial'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<'all' | 'clinical' | 'development' | 'filed' | 'commercial'>('all');
  const [batchFilter, setBatchFilter] = useState<'all' | 'ds' | 'dp'>('all');
  const [stabilityFilter, setStabilityFilter] = useState<'all' | 'ongoing' | 'completed'>('all');

  // New Substance modal state
  const [showNewSubstanceModal, setShowNewSubstanceModal] = useState(false);
  const [newSubstance, setNewSubstance] = useState({
    name: '', genericName: '', casNumber: '', molecularFormula: '', molecularWeight: '',
    synthesisRoute: '', status: 'development', manufacturer: '', productId: 'lig-2847',
  });

  // New Product modal state
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '', dosageForm: '', strength: '', routeOfAdministration: '', shelfLife: '',
    container: '', batchSize: '', status: 'development', productId: 'lig-2847',
  });

  // v129: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Filter by global product selection
  // Builds a Set that includes both store IDs AND name-normalised IDs so that
  // CMC static data (productId: 'lig-2847') still matches when the store has
  // been replaced with API products whose id is a UUID but name is 'LIG-2847'.
  const matchingProductIds = useMemo(() => {
    if (!filters) return null;
    const hasActiveFilter = filters.product !== 'all' || filters.therapeuticArea !== 'all' || filters.modality !== 'all' || filters.stage !== 'all';
    if (!hasActiveFilter) return null;
    let filtered = [...products];
    if (filters.product !== 'all') filtered = filtered.filter(p => p.id === filters.product);
    if (filters.therapeuticArea !== 'all') filtered = filtered.filter(p => p.therapeuticArea.toLowerCase().replace(/\s+/g, '-') === filters.therapeuticArea);
    // Include both the store ID and the name-normalised version (e.g. 'LIG-2847' → 'lig-2847')
    // so CMC static data productIds match even when the store was hydrated from the API.
    return new Set([
      ...filtered.map(p => p.id),
      ...filtered.map(p => p.name.toLowerCase().replace(/\s+/g, '-')),
    ]);
  }, [filters, products]);

  const filteredDrugSubstances = useMemo(() => {
    let items = drugSubstances.filter(ds => !matchingProductIds || matchingProductIds.has(ds.productId));
    if (substanceStatusFilter !== 'all') items = items.filter(ds => ds.status === substanceStatusFilter);
    if (substanceSearch) {
      const q = substanceSearch.toLowerCase();
      items = items.filter(ds => ds.name.toLowerCase().includes(q) || ds.genericName.toLowerCase().includes(q) || ds.casNumber?.toLowerCase().includes(q));
    }
    return items;
  }, [matchingProductIds, substanceStatusFilter, substanceSearch]);

  const filteredDrugProducts = useMemo(() => {
    let items = drugProducts.filter(dp => !matchingProductIds || matchingProductIds.has(dp.productId));
    if (productStatusFilter !== 'all') items = items.filter(dp => dp.status === productStatusFilter);
    if (productSearch) {
      const q = productSearch.toLowerCase();
      items = items.filter(dp => getProductName(dp.productId).toLowerCase().includes(q) || dp.dosageForm?.toLowerCase().includes(q) || dp.strength?.toLowerCase().includes(q));
    }
    return items;
  }, [matchingProductIds, productStatusFilter, productSearch]);
  const filteredBatches = useMemo(() => {
    let batches = batchRecords.filter(b => !matchingProductIds || matchingProductIds.has(b.productId));
    if (batchFilter !== 'all') batches = batches.filter(b => b.batchType === batchFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      batches = batches.filter(b => b.batchNumber.toLowerCase().includes(q) || products.find(p => p.id === b.productId)?.name.toLowerCase().includes(q));
    }
    return batches;
  }, [matchingProductIds, batchFilter, searchQuery]);
  const filteredStability = useMemo(() => {
    let studies = stabilityStudies.filter(s => !matchingProductIds || matchingProductIds.has(s.productId));
    if (stabilityFilter === 'ongoing') studies = studies.filter(s => s.status === 'ongoing');
    if (stabilityFilter === 'completed') studies = studies.filter(s => s.status === 'completed');
    return studies;
  }, [matchingProductIds, stabilityFilter]);

  const stats = useMemo(() => ({
    totalBatches: filteredBatches.length,
    releasedBatches: filteredBatches.filter(b => b.status === 'released').length,
    onStability: filteredStability.filter(s => s.status === 'ongoing').length,
    openDeviations: filteredBatches.reduce((acc, b) => acc + b.deviations.filter(d => d.status !== 'closed').length, 0),
    validatedMethods: analyticalMethods.filter(m => m.status === 'validated').length,
    sitesApproved: manufacturingSites.filter(s => s.gmpStatus === 'approved').length,
  }), [filteredBatches, filteredStability]);

  const getProductName = (productId: string) => {
    // Direct ID match
    const byId = products.find(p => p.id === productId);
    if (byId) return byId.name;
    // Name-normalised fallback: 'lig-2847' matches product with name 'LIG-2847'
    const norm = productId.toLowerCase().replace(/\s+/g, '-');
    const byName = products.find(p => p.name.toLowerCase().replace(/\s+/g, '-') === norm);
    if (byName) return byName.name;
    // Last resort: capitalise the raw ID so it at least looks intentional
    return productId.toUpperCase();
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader
        moduleId="cmc"
          showAssetContext
        title="Chemistry, Manufacturing & Controls"
        subtitle="Drug substance, drug product, batch management, stability, and analytical development"
        icon={<FlaskConical className="w-5 h-5" />}
      />
      {/* Top Bar */}
      {/* v0.43.14: Responsive module toolbar */}
      <div className="min-h-[3.5rem] border-b border-border bg-surface-elevated flex items-center px-2 sm:px-3 md:px-4 gap-2">
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide scroll-fade-right">
          <div className="flex items-center gap-1 min-w-max py-2">
          {(['overview', 'drug-substance', 'drug-product', 'batches', 'stability', 'analytical', 'facilities', 'process-dev', 'formulation', 'tech-transfer'] as CMCView[]).map(view => (
            <button key={view} onClick={() => { setActiveView(view); setSelectedDrugSubstance(null); setSelectedDrugProduct(null); setSelectedBatch(null); setSelectedStability(null); setSelectedMethod(null); setSelectedSite(null); setSelectedDOE(null); setSelectedFormulation(null); setSelectedTransfer(null); }}
              className={`px-2 sm:px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeView === view ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {view === 'overview' && <Activity className="w-4 h-4 flex-shrink-0" />}
              {view === 'drug-substance' && <Beaker className="w-4 h-4 flex-shrink-0" />}
              {view === 'drug-product' && <Package className="w-4 h-4 flex-shrink-0" />}
              {view === 'batches' && <Layers className="w-4 h-4 flex-shrink-0" />}
              {view === 'stability' && <Thermometer className="w-4 h-4 flex-shrink-0" />}
              {view === 'analytical' && <TestTube2 className="w-4 h-4 flex-shrink-0" />}
              {view === 'facilities' && <Factory className="w-4 h-4 flex-shrink-0" />}
              {view === 'process-dev' && <FlaskConical className="w-4 h-4 flex-shrink-0" />}
              {view === 'formulation' && <GitBranch className="w-4 h-4 flex-shrink-0" />}
              {view === 'tech-transfer' && <ArrowRightLeft className="w-4 h-4 flex-shrink-0" />}
              <span className="hidden md:inline">{view === 'drug-substance' ? 'Substance' : 
               view === 'drug-product' ? 'Product' : 
               view === 'process-dev' ? 'Process Dev' :
               view === 'tech-transfer' ? 'Tech Transfer' :
               view.charAt(0).toUpperCase() + view.slice(1)}</span>
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* OVERVIEW */}
        {activeView === 'overview' && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              {/* v116: Breadcrumb navigation */}
              <Breadcrumb 
                moduleId="cmc"
                viewLabel="Overview"
                className="mb-4"
              />
              
              <div className="mb-6">

                <p className="text-sm text-text-muted mt-1">Drug substance, drug product, batch records, stability & analytical methods</p>
              </div>

              {/* Stats Row - v125: Migrated to Card components. v0.125.46: All cards clickable */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-4 md:mb-6">
                <Card variant="elevated" padding="md" className="cursor-pointer hover:border-accent-blue/40 transition-colors" onClick={() => setActiveView('batches')}>
                  <div className="flex items-center gap-2 mb-2"><Layers className="w-5 h-5 text-accent-blue" /><span className="text-xs text-text-muted">Batches</span></div>
                  <div className="text-2xl font-bold text-text-primary">{stats.totalBatches}</div>
                  <div className="text-xs text-text-muted mt-1">{stats.releasedBatches} released</div>
                </Card>
                <Card variant="elevated" padding="md" className="cursor-pointer hover:border-accent-purple/40 transition-colors" onClick={() => setActiveView('stability')}>
                  <div className="flex items-center gap-2 mb-2"><Thermometer className="w-5 h-5 text-accent-purple" /><span className="text-xs text-text-muted">On Stability</span></div>
                  <div className="text-2xl font-bold text-accent-purple">{stats.onStability}</div>
                  <div className="text-xs text-text-muted mt-1">ongoing studies</div>
                </Card>
                <Card variant="elevated" padding="md" className="cursor-pointer hover:border-accent-amber/40 transition-colors" onClick={() => setActiveView('batches')}>
                  <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-accent-amber" /><span className="text-xs text-text-muted">Deviations</span></div>
                  <div className="text-2xl font-bold text-accent-amber">{stats.openDeviations}</div>
                  <div className="text-xs text-text-muted mt-1">open</div>
                </Card>
                <Card variant="elevated" padding="md" className="cursor-pointer hover:border-accent-green/40 transition-colors" onClick={() => setActiveView('drug-substance')}>
                  <div className="flex items-center gap-2 mb-2"><Beaker className="w-5 h-5 text-accent-green" /><span className="text-xs text-text-muted">Substances</span></div>
                  <div className="text-2xl font-bold text-text-primary">{filteredDrugSubstances.length}</div>
                  <div className="text-xs text-text-muted mt-1">registered</div>
                </Card>
                <Card variant="elevated" padding="md" className="cursor-pointer hover:border-accent-blue/40 transition-colors" onClick={() => setActiveView('analytical')}>
                  <div className="flex items-center gap-2 mb-2"><TestTube2 className="w-5 h-5 text-accent-blue" /><span className="text-xs text-text-muted">Methods</span></div>
                  <div className="text-2xl font-bold text-text-primary">{analyticalMethods.length}</div>
                  <div className="text-xs text-text-muted mt-1">{stats.validatedMethods} validated</div>
                </Card>
                <Card variant="elevated" padding="md" className="cursor-pointer hover:border-accent-teal/40 transition-colors" onClick={() => setActiveView('facilities')}>
                  <div className="flex items-center gap-2 mb-2"><Factory className="w-5 h-5 text-accent-teal" /><span className="text-xs text-text-muted">Sites</span></div>
                  <div className="text-2xl font-bold text-text-primary">{manufacturingSites.length}</div>
                  <div className="text-xs text-text-muted mt-1">{stats.sitesApproved} approved</div>
                </Card>
              </div>

              {/* Main Content - v125: Migrated to Card components */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <Card variant="elevated" padding="lg" className="col-span-1 md:col-span-2">
                  <CardHeader title="Recent Batches" action={<Button variant="ghost" size="sm" onClick={() => setActiveView('batches')}>View All</Button>} />
                  <CardContent>
                    <div className="space-y-2">
                      {filteredBatches.slice(0, 5).map(batch => (
                        <div key={batch.id} onClick={() => { setSelectedBatch(batch); setActiveView('batches'); }}
                          className="flex items-center justify-between p-3 bg-surface-card rounded-lg hover:bg-surface-card/80 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${batch.batchType === 'ds' ? 'bg-accent-blue/20' : 'bg-accent-green/20'}`}>
                              {batch.batchType === 'ds' ? <Beaker className="w-4 h-4 text-accent-blue" /> : <Package className="w-4 h-4 text-accent-green" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary">{batch.batchNumber}</span>
                                {getBatchScaleBadge(batch.batchScale)}
                              </div>
                              <div className="text-xs text-text-muted">{getProductName(batch.productId)} • {batch.batchSize}</div>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            {getBatchStatusBadge(batch.status)}
                            <div className="text-xs text-text-muted">{batch.manufactureDate}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card variant="elevated" padding="lg">
                  <CardHeader title="Stability Studies" action={<Button variant="ghost" size="sm" onClick={() => setActiveView('stability')}>View All</Button>} />
                  <CardContent>
                    <div className="space-y-2">
                      {filteredStability.filter(s => s.status === 'ongoing').slice(0, 4).map(study => {
                        const completed = study.timepoints.filter(t => t.status === 'completed').length;
                        const total = study.timepoints.length;
                        return (
                          <div key={study.id} onClick={() => { setSelectedStability(study); setActiveView('stability'); }}
                            className="p-3 bg-surface-card rounded-lg hover:bg-surface-card/80 cursor-pointer">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-text-primary">{study.batchNumber}</span>
                              {getStudyTypeBadge(study.studyType)}
                            </div>
                            <div className="text-xs text-text-muted mb-2">{study.condition}</div>
                            <ProgressBar value={completed} max={total} size="sm" color="purple" showLabel />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Insights - v125: Uses Card for consistency but keeps accent styling */}
              <Card variant="ghost" padding="lg" className="mt-6 bg-accent-purple/5 border border-accent-purple/20">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-accent-purple" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-text-primary mb-2">AI CMC Intelligence</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                      <div className="p-3 bg-white/50 rounded-lg">
                        <div className="text-xs text-text-muted mb-1">Shelf Life Projection</div>
                        <div className="text-sm text-text-primary">LIG-2847 DS trending stable. 36-month shelf life supportable with current data through 12M timepoint.</div>
                      </div>
                      <div className="p-3 bg-white/50 rounded-lg">
                        <div className="text-xs text-text-muted mb-1">Process Risk Analysis</div>
                        <div className="text-sm text-text-primary">Step 5 crystallization cooling rate shows highest sensitivity. Recommend PAR verification at commercial scale.</div>
                      </div>
                      <div className="p-3 bg-white/50 rounded-lg">
                        <div className="text-xs text-text-muted mb-1">Regulatory Readiness</div>
                        <div className="text-sm text-text-primary">3 registration batches manufactured. Module 3.2.S and 3.2.P documentation 95% complete.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              
              {/* AI Document Generation */}
              <div className="mt-6">
                <CMCNarrativeGenerator
                  productName="LIG-2847"
                  drugSubstance={{
                    name: filteredDrugSubstances[0]?.name || 'Ligacetam',
                    inn: filteredDrugSubstances[0]?.genericName,
                    casNumber: filteredDrugSubstances[0]?.casNumber,
                    molecularFormula: filteredDrugSubstances[0]?.molecularFormula,
                    molecularWeight: filteredDrugSubstances[0]?.molecularWeight,
                    manufacturer: filteredDrugSubstances[0]?.manufacturingSite,
                    route: filteredDrugSubstances[0]?.synthesisRoute,
                  }}
                  drugProduct={{
                    dosageForm: filteredDrugProducts[0]?.dosageForm || 'Tablets',
                    strength: filteredDrugProducts[0]?.strength || '50 mg',
                    routeOfAdministration: filteredDrugProducts[0]?.routeOfAdministration || 'Oral',
                    container: filteredDrugProducts[0]?.container,
                    shelfLife: filteredDrugProducts[0]?.shelfLife,
                  }}
                  onDocumentGenerated={(content, docType) => {
                    /* CMC doc generated */
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* DRUG SUBSTANCE */}
        {activeView === 'drug-substance' && !selectedDrugSubstance && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Drug Substances</h1>
                <div className="flex items-center gap-2">
                  <SearchInput placeholder="Search substances..." value={substanceSearch} onChange={e => setSubstanceSearch(e.target.value)} className="w-52" />
                  <Select value={substanceStatusFilter} onChange={e => setSubstanceStatusFilter(e.target.value as typeof substanceStatusFilter)}
                    options={[{ value: 'all', label: 'All Statuses' }, { value: 'clinical', label: 'Clinical' }, { value: 'development', label: 'Development' }, { value: 'filed', label: 'Filed' }, { value: 'commercial', label: 'Commercial' }]} />
                  <Button variant="primary" size="sm" onClick={() => setShowNewSubstanceModal(true)}>+ New Substance</Button>
                </div>
              </div>
              {filteredDrugSubstances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-accent-blue/10 flex items-center justify-center mb-4"><Beaker className="w-8 h-8 text-accent-blue" /></div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">No drug substances found</h3>
                  <p className="text-sm text-text-muted mb-6 max-w-sm">{substanceSearch || substanceStatusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Register a drug substance to get started.'}</p>
                  <Button variant="primary" size="sm" onClick={() => setShowNewSubstanceModal(true)}>+ Register Drug Substance</Button>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredDrugSubstances.map(ds => (
                  <Card key={ds.id} variant="interactive" padding="lg" onClick={() => setSelectedDrugSubstance(ds)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-accent-blue/20 flex items-center justify-center"><Beaker className="w-6 h-6 text-accent-blue" /></div>
                        <div><h3 className="text-lg font-semibold text-text-primary">{ds.name}</h3><p className="text-sm text-text-muted">{ds.genericName}</p></div>
                      </div>
                      {getProductStatusBadge(ds.status)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm mb-4">
                      <div><span className="text-text-muted">CAS:</span> <span className="text-text-primary">{ds.casNumber}</span></div>
                      <div><span className="text-text-muted">MW:</span> <span className="text-text-primary">{ds.molecularWeight}</span></div>
                      <div><span className="text-text-muted">Formula:</span> <span className="text-text-primary">{ds.molecularFormula}</span></div>
                      <div><span className="text-text-muted">Route:</span> <span className="text-text-primary">{ds.synthesisRoute}</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-xs text-text-muted">{ds.specifications.length} specifications</span>
                      <span className="text-xs text-text-muted">{ds.criticalSteps.length} critical steps</span>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </Card>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {/* Drug Substance Detail */}
        {activeView === 'drug-substance' && selectedDrugSubstance && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDrugSubstance(null)}>Drug Substances</Button>
                <ChevronRight className="w-4 h-4" /><span className="text-text-primary">{selectedDrugSubstance.name}</span>
              </div>
              <div className="flex items-start justify-between mb-6">
                <div><h1 className="text-2xl font-semibold text-text-primary">{selectedDrugSubstance.name}</h1><p className="text-sm text-text-muted">{selectedDrugSubstance.genericName} • {selectedDrugSubstance.structure}</p></div>
                <div className="flex items-center gap-2">
                  {getProductStatusBadge(selectedDrugSubstance.status)}
                  <Button variant="outline" size="sm" onClick={() => { setNewSubstance({ name: selectedDrugSubstance.name, genericName: selectedDrugSubstance.genericName, casNumber: selectedDrugSubstance.casNumber || '', molecularFormula: selectedDrugSubstance.molecularFormula, molecularWeight: String(selectedDrugSubstance.molecularWeight), synthesisRoute: selectedDrugSubstance.synthesisRoute, status: selectedDrugSubstance.status, manufacturer: selectedDrugSubstance.manufacturer, productId: selectedDrugSubstance.productId }); setShowNewSubstanceModal(true); }}>Edit</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
                  <Card variant="elevated" padding="lg">
                    <CardHeader title="General Information" />
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                        {[{ label: 'CAS Number', value: selectedDrugSubstance.casNumber }, { label: 'Molecular Weight', value: `${selectedDrugSubstance.molecularWeight} g/mol` }, { label: 'Molecular Formula', value: selectedDrugSubstance.molecularFormula }, { label: 'Synthesis Route', value: selectedDrugSubstance.synthesisRoute }].map((item, i) => (
                          <div key={i} className="p-3 bg-surface-card rounded-lg"><div className="text-xs text-text-muted mb-1">{item.label}</div><div className="font-medium text-text-primary">{item.value}</div></div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card variant="elevated" padding="lg">
                    <CardHeader title="Specifications" />
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b border-border"><th className="text-left py-2 text-text-muted font-medium">Parameter</th><th className="text-left py-2 text-text-muted font-medium">Method</th><th className="text-left py-2 text-text-muted font-medium">Acceptance</th><th className="text-left py-2 text-text-muted font-medium">Typical</th></tr></thead>
                          <tbody>
                            {selectedDrugSubstance.specifications.map(spec => (
                              <tr key={spec.id} className="border-b border-border/50"><td className="py-2 text-text-primary">{spec.parameter}</td><td className="py-2 text-text-secondary">{spec.method}</td><td className="py-2 text-text-secondary">{spec.acceptanceCriteria}</td><td className="py-2 text-accent-green">{spec.typicalResult}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                  <Card variant="elevated" padding="lg">
                    <CardHeader title="Critical Process Steps" />
                    <CardContent>
                      <div className="space-y-2">
                        {selectedDrugSubstance.criticalSteps.map((step, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 bg-surface-card rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-accent-red/20 flex items-center justify-center text-xs font-bold text-accent-red">{i + 1}</div>
                            <span className="text-sm text-text-primary">{step}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4 md:space-y-6">
                  <Card variant="elevated" padding="lg">
                    <CardHeader title="Manufacturing" />
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 bg-surface-card rounded-lg"><div className="text-xs text-text-muted mb-1">Manufacturer</div><div className="text-sm font-medium text-text-primary">{selectedDrugSubstance.manufacturer}</div></div>
                        <div className="p-3 bg-surface-card rounded-lg"><div className="text-xs text-text-muted mb-1">Site</div><div className="text-sm font-medium text-text-primary">{getSiteById(selectedDrugSubstance.manufacturingSite)?.name || 'Unknown'}</div></div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card variant="elevated" padding="lg">
                    <CardHeader title="Related Batches" />
                    <CardContent>
                      <div className="space-y-2">
                        {getBatchesByProduct(selectedDrugSubstance.productId).filter(b => b.batchType === 'ds').slice(0, 3).map(batch => (
                          <div key={batch.id} className="p-2 bg-surface-card rounded-lg text-sm flex items-center justify-between">
                            <span className="font-medium text-text-primary">{batch.batchNumber}</span>
                            {getBatchStatusBadge(batch.status)}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* v0.34.4: Smart Submissions - FDA Hybrid Document Generator */}
                  <SmartDocumentGenerator
                    documentType="cmc-quality"
                    productId={selectedDrugSubstance.productId}
                    productName={getProductName(selectedDrugSubstance.productId)}
                    substanceName={selectedDrugSubstance.name}
                    applicationNumber="NDA 215847"
                    ctdModule="Module 3"
                    ctdSection="3.2.S"
                    sections={[]}
                    specifications={[]}
                    author="CMC Team"
                    version="1.0"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DRUG PRODUCT */}
        {activeView === 'drug-product' && !selectedDrugProduct && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Drug Products</h1>
                <div className="flex items-center gap-2">
                  <SearchInput placeholder="Search products..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-52" />
                  <Select value={productStatusFilter} onChange={e => setProductStatusFilter(e.target.value as typeof productStatusFilter)}
                    options={[{ value: 'all', label: 'All Statuses' }, { value: 'clinical', label: 'Clinical' }, { value: 'development', label: 'Development' }, { value: 'filed', label: 'Filed' }, { value: 'commercial', label: 'Commercial' }]} />
                  <Button variant="primary" size="sm" onClick={() => setShowNewProductModal(true)}>+ New Product</Button>
                </div>
              </div>
              {filteredDrugProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center mb-4"><Package className="w-8 h-8 text-accent-green" /></div>
                  <h3 className="text-lg font-semibold text-text-primary mb-1">No drug products found</h3>
                  <p className="text-sm text-text-muted mb-6 max-w-sm">{productSearch || productStatusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'Register a drug product to get started.'}</p>
                  <Button variant="primary" size="sm" onClick={() => setShowNewProductModal(true)}>+ Register Drug Product</Button>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredDrugProducts.map(dp => (
                  <Card key={dp.id} variant="interactive" padding="lg" onClick={() => setSelectedDrugProduct(dp)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-accent-green/20 flex items-center justify-center"><Package className="w-6 h-6 text-accent-green" /></div>
                        <div><h3 className="text-lg font-semibold text-text-primary">{getProductName(dp.productId)}</h3><p className="text-sm text-text-muted">{dp.dosageForm} • {dp.strength}</p></div>
                      </div>
                      {getProductStatusBadge(dp.status)}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm mb-4">
                      <div><span className="text-text-muted">Route:</span> <span className="text-text-primary">{dp.routeOfAdministration}</span></div>
                      <div><span className="text-text-muted">Shelf Life:</span> <span className="text-text-primary">{dp.shelfLife}</span></div>
                      <div><span className="text-text-muted">Container:</span> <span className="text-text-primary">{dp.container}</span></div>
                      <div><span className="text-text-muted">Batch Size:</span> <span className="text-text-primary">{dp.batchSize}</span></div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-xs text-text-muted">{dp.composition.length} components</span>
                      <span className="text-xs text-text-muted">{dp.specifications.length} specifications</span>
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    </div>
                  </Card>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {/* Drug Product Detail */}
        {activeView === 'drug-product' && selectedDrugProduct && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDrugProduct(null)}>Drug Products</Button>
                <ChevronRight className="w-4 h-4" /><span className="text-text-primary">{getProductName(selectedDrugProduct.productId)}</span>
              </div>
              <div className="flex items-start justify-between mb-6">
                <div><h1 className="text-2xl font-semibold text-text-primary">{getProductName(selectedDrugProduct.productId)}</h1><p className="text-sm text-text-muted">{selectedDrugProduct.dosageForm} • {selectedDrugProduct.strength}</p></div>
                <div className="flex items-center gap-2">
                  {getProductStatusBadge(selectedDrugProduct.status)}
                  <Button variant="outline" size="sm" onClick={() => { setNewProduct({ name: getProductName(selectedDrugProduct.productId), dosageForm: selectedDrugProduct.dosageForm, strength: selectedDrugProduct.strength, routeOfAdministration: selectedDrugProduct.routeOfAdministration, shelfLife: selectedDrugProduct.shelfLife, container: selectedDrugProduct.container, batchSize: selectedDrugProduct.batchSize, status: selectedDrugProduct.status, productId: selectedDrugProduct.productId }); setShowNewProductModal(true); }}>Edit</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
                  <Card variant="elevated" padding="lg">
                    <CardHeader title="Composition" />
                    <CardContent>
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-border"><th className="text-left py-2 text-text-muted font-medium">Component</th><th className="text-left py-2 text-text-muted font-medium">Function</th><th className="text-right py-2 text-text-muted font-medium">Amount</th><th className="text-right py-2 text-text-muted font-medium">%w/w</th></tr></thead>
                        <tbody>
                          {selectedDrugProduct.composition.map((comp, i) => (
                            <tr key={i} className="border-b border-border/50"><td className="py-2 text-text-primary font-medium">{comp.name}</td><td className="py-2 text-text-secondary">{comp.function}</td><td className="py-2 text-right text-text-secondary">{comp.amount}</td><td className="py-2 text-right text-text-secondary">{comp.percentW}%</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                  <Card variant="elevated" padding="lg">
                    <CardHeader title="Specifications" />
                    <CardContent>
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-border"><th className="text-left py-2 text-text-muted font-medium">Parameter</th><th className="text-left py-2 text-text-muted font-medium">Method</th><th className="text-left py-2 text-text-muted font-medium">Acceptance</th><th className="text-left py-2 text-text-muted font-medium">Typical</th></tr></thead>
                        <tbody>
                          {selectedDrugProduct.specifications.map(spec => (
                            <tr key={spec.id} className="border-b border-border/50"><td className="py-2 text-text-primary">{spec.parameter}</td><td className="py-2 text-text-secondary">{spec.method}</td><td className="py-2 text-text-secondary">{spec.acceptanceCriteria}</td><td className="py-2 text-accent-green">{spec.typicalResult}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4 md:space-y-6">
                  <Card variant="elevated" padding="lg">
                    <CardHeader title="Product Info" />
                    <CardContent>
                      <div className="space-y-3">
                        {[{ label: 'Storage', value: selectedDrugProduct.storageConditions }, { label: 'Container', value: selectedDrugProduct.container }, { label: 'Closure', value: selectedDrugProduct.closure }, { label: 'Site', value: getSiteById(selectedDrugProduct.manufacturingSite)?.name || 'Unknown' }].map((item, i) => (
                          <div key={i} className="p-3 bg-surface-card rounded-lg"><div className="text-xs text-text-muted mb-1">{item.label}</div><div className="text-sm text-text-primary">{item.value}</div></div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BATCHES */}
        {activeView === 'batches' && !selectedBatch && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Batch Records</h1>
                <div className="flex items-center gap-3">
                  <SearchInput 
                    placeholder="Search batches..." 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-64"
                  />
                  <Select 
                    value={batchFilter} 
                    onChange={e => setBatchFilter(e.target.value as 'all' | 'ds' | 'dp')}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'ds', label: 'Drug Substance' },
                      { value: 'dp', label: 'Drug Product' }
                    ]}
                  />
                </div>
              </div>
              {/* Batch Yield Chart — v0.125.61 */}
              {(() => {
                const yieldData = filteredBatches
                  .filter(b => b.batchScale !== 'lab')
                  .map(b => ({ batch: b.batchNumber.split('-').slice(-1)[0], batchNumber: b.batchNumber, yield: b.yield || 94, status: b.status, pass: b.status === 'released' || b.status === 'in-progress' }));
                if (yieldData.length < 2) return null;
                return (
                  <div className="bg-surface-elevated border border-border rounded-lg p-5 mb-6">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-semibold text-text-primary">Batch Yield Trend</h3>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-green inline-block" />Released</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-red inline-block" />Failed</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-accent-amber inline-block" />In Progress</span>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mb-4">Commercial-scale batches · 21 CFR 211.188 · Target yield ≥90%</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={yieldData} margin={{ top: 4, right: 16, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="batch" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis domain={[75, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} unit="%" />
                        <Tooltip
                          contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11px' }}
                          formatter={(v: number) => [`${v}%`, 'Yield']}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.batchNumber ?? ''}
                        />
                        <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Min 90%', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
                        <Bar dataKey="yield" radius={[3, 3, 0, 0]}>
                          {yieldData.map((entry, i) => (
                            <Cell key={i} fill={entry.status === 'failed' ? '#ef4444' : entry.status === 'in-progress' ? '#f59e0b' : '#22c55e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })()}

              <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-border bg-surface-card">
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Batch Number</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Product</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Scale</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Manufactured</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Status</th>
                  </tr></thead>
                  <tbody>
                    {filteredBatches.map(batch => (
                      <tr key={batch.id} onClick={() => setSelectedBatch(batch)} className="border-b border-border/50 hover:bg-surface-card cursor-pointer">
                        <td className="px-4 py-3 text-sm font-medium text-accent-blue">{batch.batchNumber}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">{getProductName(batch.productId)}</td>
                        <td className="px-4 py-3"><Badge color={batch.batchType === 'ds' ? 'blue' : 'green'} size="sm">{batch.batchType === 'ds' ? 'DS' : 'DP'}</Badge></td>
                        <td className="px-4 py-3">{getBatchScaleBadge(batch.batchScale)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{batch.manufactureDate}</td>
                        <td className="px-4 py-3">{getBatchStatusBadge(batch.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Batch Detail */}
        {activeView === 'batches' && selectedBatch && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedBatch(null)}>Batch Records</Button>
                <ChevronRight className="w-4 h-4" /><span className="text-text-primary">{selectedBatch.batchNumber}</span>
              </div>
              <div className="flex items-start justify-between mb-6">
                <div><h1 className="text-2xl font-semibold text-text-primary">{selectedBatch.batchNumber}</h1><p className="text-sm text-text-muted">{getProductName(selectedBatch.productId)} • {selectedBatch.batchType === 'ds' ? 'Drug Substance' : 'Drug Product'}</p></div>
                {getBatchStatusBadge(selectedBatch.status)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
                  <div className="bg-surface-elevated border border-border rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-4">Batch Results</h3>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-border"><th className="text-left py-2 text-text-muted font-medium">Parameter</th><th className="text-left py-2 text-text-muted font-medium">Specification</th><th className="text-left py-2 text-text-muted font-medium">Result</th><th className="text-left py-2 text-text-muted font-medium">Status</th></tr></thead>
                      <tbody>
                        {selectedBatch.results.map((result, i) => (
                          <tr key={i} className="border-b border-border/50"><td className="py-2 text-text-primary">{result.parameter}</td><td className="py-2 text-text-secondary">{result.specification}</td><td className="py-2 text-text-primary font-medium">{result.result}</td><td className="py-2">{getTestResultBadge(result.status)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {selectedBatch.deviations.length > 0 && (
                    <div className="bg-surface-elevated border border-border rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-text-primary mb-4">Deviations</h3>
                      <div className="space-y-2">
                        {selectedBatch.deviations.map(dev => (
                          <div key={dev.id} className="p-3 bg-surface-card rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              {getDeviationCategoryBadge(dev.category)}
                              {getBatchStatusBadge(dev.status)}
                            </div>
                            <p className="text-sm text-text-primary">{dev.description}</p>
                            {dev.rootCause && <p className="text-xs text-text-muted mt-1">Root Cause: {dev.rootCause}</p>}
                            {dev.capa && <p className="text-xs text-text-muted">CAPA: {dev.capa}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4 md:space-y-6">
                  <div className="bg-surface-elevated border border-border rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-4">Batch Info</h3>
                    <div className="space-y-3">
                      {[{ label: 'Scale', value: selectedBatch.batchScale }, { label: 'Size', value: selectedBatch.batchSize }, { label: 'Site', value: getSiteById(selectedBatch.manufacturingSite)?.name || selectedBatch.manufacturingSite }, { label: 'Manufactured', value: selectedBatch.manufactureDate }, { label: 'Released', value: selectedBatch.releaseDate || 'Pending' }, { label: 'Expiration', value: selectedBatch.expirationDate || 'TBD' }].map((item, i) => (
                        <div key={i} className="flex justify-between text-sm"><span className="text-text-muted">{item.label}</span><span className="text-text-primary">{item.value}</span></div>
                      ))}
                    </div>
                  </div>
                  {selectedBatch.usedInStudies && selectedBatch.usedInStudies.length > 0 && (
                    <div className="bg-surface-elevated border border-border rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-text-primary mb-4">Used In</h3>
                      <div className="space-y-2">
                        {selectedBatch.usedInStudies.map((study, i) => (
                          <div key={i} className="px-3 py-2 bg-surface-card rounded-lg text-sm text-text-primary">{study}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Batch Release Action — v0.125.61 */}
                  <div className="bg-surface-elevated border border-border rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Batch Disposition</h3>
                    {(releasedBatchIds.has(selectedBatch.id) || selectedBatch.status === 'released') ? (
                      <div className="flex items-center gap-2 text-sm text-accent-green">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-medium">Released</span>
                        <span className="text-text-muted text-xs">— QP e-sig on record</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setReleasingBatch(selectedBatch); setReleaseStep('confirm'); setReleasePin(''); setReleasePinError(''); }}
                        className="w-full px-4 py-2.5 bg-accent-green text-white rounded-lg text-sm font-medium hover:bg-accent-green/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />Release Batch (QP Sign-off)
                      </button>
                    )}
                    <p className="text-xs text-text-muted mt-2">21 CFR Part 211.192 · EU GMP Annex 16</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STABILITY */}
        {activeView === 'stability' && !selectedStability && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Stability Studies</h1>
                <Select 
                  value={stabilityFilter} 
                  onChange={e => setStabilityFilter(e.target.value as 'all' | 'ongoing' | 'completed')}
                  options={[
                    { value: 'all', label: 'All Studies' },
                    { value: 'ongoing', label: 'Ongoing' },
                    { value: 'completed', label: 'Completed' }
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredStability.map(study => {
                  const completed = study.timepoints.filter(t => t.status === 'completed').length;
                  const total = study.timepoints.length;
                  return (
                    <div key={study.id} onClick={() => setSelectedStability(study)}
                      className="bg-surface-elevated border border-border rounded-lg p-5 hover:border-accent-purple/50 cursor-pointer">
                      <div className="flex items-start justify-between mb-4">
                        <div><h3 className="text-lg font-semibold text-text-primary">{study.batchNumber}</h3><p className="text-sm text-text-muted">{getProductName(study.productId)}</p></div>
                        {getStabilityStatusBadge(study.status)}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm mb-4">
                        <div><span className="text-text-muted">Type:</span> <span className="text-text-primary capitalize">{study.studyType}</span></div>
                        <div><span className="text-text-muted">Condition:</span> <span className="text-text-primary">{study.condition}</span></div>
                        <div><span className="text-text-muted">Start:</span> <span className="text-text-primary">{study.startDate}</span></div>
                        <div><span className="text-text-muted">Protocol:</span> <span className="text-text-primary">{study.protocol}</span></div>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <ProgressBar value={completed} max={total} size="sm" color="purple" showLabel label={`${completed}/${total} timepoints`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Stability Detail */}
        {activeView === 'stability' && selectedStability && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedStability(null)}>Stability Studies</Button>
                <ChevronRight className="w-4 h-4" /><span className="text-text-primary">{selectedStability.batchNumber}</span>
              </div>
              <div className="flex items-start justify-between mb-6">
                <div><h1 className="text-2xl font-semibold text-text-primary">{selectedStability.batchNumber}</h1><p className="text-sm text-text-muted">{selectedStability.studyType} • {selectedStability.condition}</p></div>
                {getStabilityStatusBadge(selectedStability.status)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="col-span-1 md:col-span-2">
                  {/* Stability Trend Chart — v0.125.61 */}
                  {(() => {
                    const completedTps = selectedStability.timepoints.filter(tp => tp.status === 'completed' && tp.results && tp.results.length > 0);
                    if (completedTps.length < 2) return null;
                    // Build chart series per parameter
                    const params = [...new Set(completedTps.flatMap(tp => (tp.results || []).map(r => r.parameter)))];
                    const chartData = completedTps.map(tp => {
                      const row: Record<string, number | string> = { month: `M${tp.months}` };
                      (tp.results || []).forEach(r => {
                        const num = parseFloat(r.result.replace(/[^0-9.]/g, ''));
                        if (!isNaN(num)) row[r.parameter] = num;
                      });
                      return row;
                    });
                    const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444'];
                    // Spec limit from first result of first param
                    const firstParam = params[0];
                    const specText = completedTps[0]?.results?.find(r => r.parameter === firstParam)?.specification || '';
                    const upperLimit = parseFloat(specText.match(/[0-9]+.?[0-9]*/)?.[0] ?? '');
                    return (
                      <div className="bg-surface-elevated border border-border rounded-lg p-5 mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-sm font-semibold text-text-primary">Stability Trend</h3>
                          <span className="text-xs text-text-muted">ICH Q1A(R2) · {selectedStability.condition}</span>
                        </div>
                        <p className="text-xs text-text-muted mb-4">Parameter values at completed timepoints — spec limits shown as reference lines</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={chartData} margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11px' }}
                              formatter={(v: number, name: string) => [`${v}`, name]}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            {!isNaN(upperLimit) && (
                              <ReferenceLine y={upperLimit} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Upper Spec', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }} />
                            )}
                            {params.slice(0, 3).map((param, i) => (
                              <Line key={param} type="monotone" dataKey={param} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} connectNulls />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-text-muted">
                          <span>Protocol: <span className="text-text-primary">{selectedStability.protocol}</span></span>
                          <span>Start: <span className="text-text-primary">{selectedStability.startDate}</span></span>
                          {selectedStability.conclusions && <span className="text-accent-green font-medium">✓ Conclusions available</span>}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-surface-elevated border border-border rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-4">Timepoints</h3>
                    <div className="space-y-3">
                      {selectedStability.timepoints.map((tp, i) => (
                        <div key={i} className={`p-4 rounded-lg ${tp.status === 'completed' ? 'bg-accent-green/10 border border-accent-green/20' : tp.status === 'scheduled' ? 'bg-surface-card' : 'bg-accent-red/10 border border-accent-red/20'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-text-primary">{tp.months} Months</span>
                            {getTimepointStatusBadge(tp.status)}
                          </div>
                          {tp.results && tp.results.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {tp.results.map((result, j) => (
                                <div key={j} className="flex items-center justify-between text-sm">
                                  <span className="text-text-muted">{result.parameter}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-text-primary">{result.result}</span>
                                    {result.trend && <span className={`text-xs ${result.trend === 'stable' ? 'text-accent-green' : result.trend === 'increasing' ? 'text-accent-amber' : 'text-accent-red'}`}>{result.trend === 'stable' ? '→' : result.trend === 'increasing' ? '↑' : '↓'}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-4 md:space-y-6">
                  <div className="bg-surface-elevated border border-border rounded-lg p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-4">Study Info</h3>
                    <div className="space-y-3">
                      {[{ label: 'Product', value: getProductName(selectedStability.productId) }, { label: 'Protocol', value: selectedStability.protocol }, { label: 'Start Date', value: selectedStability.startDate }].map((item, i) => (
                        <div key={i} className="flex justify-between text-sm"><span className="text-text-muted">{item.label}</span><span className="text-text-primary">{item.value}</span></div>
                      ))}
                    </div>
                  </div>
                  {selectedStability.conclusions && (
                    <div className="bg-accent-green/10 border border-accent-green/20 rounded-lg p-5">
                      <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent-green" />Conclusions</h3>
                      <p className="text-sm text-text-secondary">{selectedStability.conclusions}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICAL METHODS */}
        {activeView === 'analytical' && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-2xl font-semibold text-text-primary mb-2">Analytical Methods</h1>
              <p className="text-sm text-text-muted mb-6">Method validation per ICH Q2(R1) · Click any method for detail</p>

              {/* ICH Q2(R1) Validation Characteristics Summary */}
              <div className="bg-surface-elevated border border-border rounded-lg p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-accent-blue" />
                  <h3 className="text-sm font-semibold text-text-primary">ICH Q2(R1) Validation Status</h3>
                  <Badge color="blue" size="xs">Q2(R1) 2005</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-2 text-xs font-medium text-text-muted">Characteristic</th>
                        <th className="text-center pb-2 text-xs font-medium text-text-muted">Assay</th>
                        <th className="text-center pb-2 text-xs font-medium text-text-muted">Impurities</th>
                        <th className="text-center pb-2 text-xs font-medium text-text-muted">Dissolution</th>
                        <th className="text-center pb-2 text-xs font-medium text-text-muted">ID Test</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { char: 'Specificity', assay: true, imp: true, diss: true, id: true },
                        { char: 'Linearity', assay: true, imp: true, diss: true, id: false },
                        { char: 'Range', assay: true, imp: true, diss: true, id: false },
                        { char: 'Accuracy', assay: true, imp: true, diss: true, id: false },
                        { char: 'Precision (Repeatability)', assay: true, imp: true, diss: true, id: false },
                        { char: 'Intermediate Precision', assay: true, imp: true, diss: false, id: false },
                        { char: 'LOD', assay: false, imp: true, diss: false, id: false },
                        { char: 'LOQ', assay: false, imp: true, diss: false, id: false },
                        { char: 'Robustness', assay: true, imp: true, diss: true, id: true },
                      ].map(row => (
                        <tr key={row.char} className="border-b border-border/50">
                          <td className="py-2 text-sm text-text-primary">{row.char}</td>
                          {[row.assay, row.imp, row.diss, row.id].map((req, i) => (
                            <td key={i} className="py-2 text-center">
                              {req
                                ? <CheckCircle className="w-3.5 h-3.5 text-accent-green mx-auto" />
                                : <span className="text-xs text-text-muted">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Method table — clickable rows */}
              <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-border bg-surface-card">
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Method Name</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Purpose</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Applicable To</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-text-muted font-medium">Last Validated</th>
                  </tr></thead>
                  <tbody>
                    {analyticalMethods.map(method => (
                      <tr key={method.id} className="border-b border-border/50 hover:bg-surface-card cursor-pointer" onClick={() => setSelectedMethodDetail(method)}>
                        <td className="px-4 py-3 text-sm font-medium text-accent-blue">{method.name}</td>
                        <td className="px-4 py-3">{getMethodTypeBadge(method.type)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{method.purpose}</td>
                        <td className="px-4 py-3"><div className="flex gap-1">{method.applicableTo.map(a => (<Badge key={a} color="slate" size="xs" className="uppercase">{a}</Badge>))}</div></td>
                        <td className="px-4 py-3">{getMethodStatusBadge(method.status)}</td>
                        <td className="px-4 py-3 text-sm text-text-secondary">{method.lastValidated || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FACILITIES */}
        {activeView === 'facilities' && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-2xl font-semibold text-text-primary mb-6">Manufacturing Sites</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {manufacturingSites.map(site => (
                  <div key={site.id} className="bg-surface-elevated border border-border rounded-lg p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-accent-teal/20 flex items-center justify-center"><Factory className="w-6 h-6 text-accent-teal" /></div>
                        <div><h3 className="text-lg font-semibold text-text-primary">{site.name}</h3><p className="text-sm text-text-muted">{site.country}</p></div>
                      </div>
                      {getGMPStatusBadge(site.gmpStatus)}
                    </div>
                    <p className="text-sm text-text-secondary mb-4">{site.address}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm mb-4">
                      <div><span className="text-text-muted">Type:</span> <span className="text-text-primary uppercase">{site.type}</span></div>
                      <div><span className="text-text-muted">Products:</span> <span className="text-text-primary">{site.products.length}</span></div>
                      <div><span className="text-text-muted">Last Inspection:</span> <span className="text-text-primary">{site.lastInspection || 'N/A'}</span></div>
                      <div><span className="text-text-muted">Next Inspection:</span> <span className="text-text-primary">{site.nextInspection || 'TBD'}</span></div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <div className="text-xs text-text-muted mb-2">Capabilities</div>
                      <div className="flex flex-wrap gap-1">
                        {site.capabilities.slice(0, 3).map((cap, i) => (<Badge key={i} color="slate" size="xs">{cap}</Badge>))}
                        {site.capabilities.length > 3 && <span className="text-xs px-2 py-1 text-text-muted">+{site.capabilities.length - 3} more</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================ */}
        {/* v0.8.1: PROCESS DEVELOPMENT (DOE STUDIES) */}
        {/* ============================================================================ */}
        {activeView === 'process-dev' && !selectedDOE && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <Breadcrumb moduleId="cmc" viewLabel="Process Development" className="mb-4" />
              
              {/* v0.8.1: R&D Connected Hero */}
              <div className="bg-gradient-to-r from-accent-purple/20 to-accent-blue/20 border border-accent-purple/30 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent-purple/30 flex items-center justify-center">
                    <FlaskConical className="w-6 h-6 text-accent-purple" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-text-primary mb-1">Process Development</h2>
                    <p className="text-sm text-text-secondary">DOE studies that establish critical process parameters. <span className="text-accent-purple font-medium">R&D Connected:</span> These studies are the source data for Manufacturing CPPs.</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-accent-purple">{doeStudies.filter(d => d.status === 'completed').length}</div>
                    <div className="text-xs text-text-muted">Completed Studies</div>
                  </div>
                </div>
              </div>

              <h1 className="text-2xl font-semibold text-text-primary mb-6">DOE Studies</h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {doeStudies.map(doe => (
                  <div key={doe.id} onClick={() => setSelectedDOE(doe)}
                    className="bg-surface-elevated border border-border rounded-lg p-5 hover:border-accent-purple/50 cursor-pointer transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doe.status === 'completed' ? 'bg-accent-green/20' : doe.status === 'in-progress' ? 'bg-accent-blue/20' : 'bg-surface-card'}`}>
                          <Target className={`w-5 h-5 ${doe.status === 'completed' ? 'text-accent-green' : doe.status === 'in-progress' ? 'text-accent-blue' : 'text-text-muted'}`} />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-text-primary">{doe.studyNumber}</h3>
                          <p className="text-xs text-text-muted">{getProductName(doe.productId)}</p>
                        </div>
                      </div>
                      <Badge color={doe.status === 'completed' ? 'green' : doe.status === 'in-progress' ? 'blue' : 'slate'} size="sm">{doe.status}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary mb-4 line-clamp-2">{doe.title}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-sm mb-4">
                      <div><span className="text-text-muted">Type:</span> <span className="text-text-primary capitalize">{doe.type}</span></div>
                      <div><span className="text-text-muted">Factors:</span> <span className="text-text-primary">{doe.factors.length}</span></div>
                      <div><span className="text-text-muted">Runs:</span> <span className="text-text-primary">{doe.completedRuns}/{doe.runs}</span></div>
                    </div>
                    {doe.linkedCPPs.length > 0 && (
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center gap-2 text-xs text-accent-purple">
                          <Sparkles className="w-3 h-3" />
                          <span>Linked to {doe.linkedCPPs.length} CPP{doe.linkedCPPs.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DOE Study Detail */}
        {activeView === 'process-dev' && selectedDOE && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedDOE(null)}>Process Development</Button>
                <ChevronRight className="w-4 h-4" /><span className="text-text-primary">{selectedDOE.studyNumber}</span>
              </div>
              
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">{selectedDOE.studyNumber}</h1>
                  <p className="text-sm text-text-muted mt-1">{selectedDOE.title}</p>
                </div>
                <Badge color={selectedDOE.status === 'completed' ? 'green' : selectedDOE.status === 'in-progress' ? 'blue' : 'slate'} size="md">{selectedDOE.status}</Badge>
              </div>

              {/* R&D Connected callout */}
              {selectedDOE.linkedManufacturingParams.length > 0 && (
                <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-accent-purple mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold">R&D Connected: Manufacturing Traceability</span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    This DOE study establishes the operating parameters for: <span className="font-medium text-text-primary">{selectedDOE.linkedManufacturingParams.join(', ')}</span>.
                    These parameters flow directly to Manufacturing batch records.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Main Content */}
                <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
                  {/* Study Info */}
                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Study Information</h3></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                        <div><span className="text-text-muted">Design:</span> <span className="text-text-primary">{selectedDOE.design}</span></div>
                        <div><span className="text-text-muted">Type:</span> <span className="text-text-primary capitalize">{selectedDOE.type}</span></div>
                        <div><span className="text-text-muted">Start Date:</span> <span className="text-text-primary">{selectedDOE.startDate}</span></div>
                        <div><span className="text-text-muted">End Date:</span> <span className="text-text-primary">{selectedDOE.endDate || 'In Progress'}</span></div>
                        <div><span className="text-text-muted">PI:</span> <span className="text-text-primary">{selectedDOE.principalInvestigator}</span></div>
                        <div><span className="text-text-muted">Runs:</span> <span className="text-text-primary">{selectedDOE.completedRuns}/{selectedDOE.runs}</span></div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-sm text-text-muted mb-1">Objective</div>
                        <p className="text-sm text-text-primary">{selectedDOE.objective}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Factors */}
                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Factors ({selectedDOE.factors.length})</h3></CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <thead><tr className="border-b border-border bg-surface-card">
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Factor</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Low</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Center</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">High</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Final</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">PAR</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Critical</th>
                        </tr></thead>
                        <tbody>
                          {selectedDOE.factors.map((factor, i) => (
                            <tr key={i} className={`border-b border-border/50 ${factor.isCritical ? 'bg-accent-purple/5' : ''}`}>
                              <td className="px-4 py-2 text-sm font-medium text-text-primary">{factor.name}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{factor.lowLevel} {factor.unit}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{factor.centerPoint} {factor.unit}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{factor.highLevel} {factor.unit}</td>
                              <td className="px-4 py-2 text-sm text-accent-green font-medium">{factor.finalSetpoint || '-'} {factor.finalSetpoint ? factor.unit : ''}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{factor.provenAcceptableRange || '-'}</td>
                              <td className="px-4 py-2">{factor.isCritical ? <Badge color="purple" size="xs">CPP</Badge> : <span className="text-text-muted text-xs">-</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* Responses */}
                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Responses ({selectedDOE.responses.length})</h3></CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <thead><tr className="border-b border-border bg-surface-card">
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Response</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Specification</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Target</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">CQA</th>
                        </tr></thead>
                        <tbody>
                          {selectedDOE.responses.map((resp, i) => (
                            <tr key={i} className={`border-b border-border/50 ${resp.impactsCQA ? 'bg-accent-green/5' : ''}`}>
                              <td className="px-4 py-2 text-sm font-medium text-text-primary">{resp.name}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{resp.specification || '-'}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{resp.targetValue || '-'}</td>
                              <td className="px-4 py-2">{resp.impactsCQA ? <Badge color="green" size="xs">CQA</Badge> : <span className="text-text-muted text-xs">-</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* Conclusions */}
                  {selectedDOE.conclusions && (
                    <Card variant="elevated" className="border-accent-green/30 bg-accent-green/5">
                      <CardHeader><h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent-green" />Conclusions</h3></CardHeader>
                      <CardContent>
                        <p className="text-sm text-text-secondary">{selectedDOE.conclusions}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4 md:space-y-6">
                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Linked CPPs</h3></CardHeader>
                    <CardContent>
                      {selectedDOE.linkedCPPs.length > 0 ? (
                        <div className="space-y-2">
                          {selectedDOE.linkedCPPs.map((cpp, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Target className="w-4 h-4 text-accent-purple" />
                              <span className="text-text-primary">{cpp}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted">No linked CPPs</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Manufacturing Parameters</h3></CardHeader>
                    <CardContent>
                      {selectedDOE.linkedManufacturingParams.length > 0 ? (
                        <div className="space-y-2">
                          {selectedDOE.linkedManufacturingParams.map((param, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Factory className="w-4 h-4 text-accent-teal" />
                              <span className="text-text-primary">{param}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-text-muted">No linked parameters</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================ */}
        {/* v0.8.1: FORMULATION DEVELOPMENT */}
        {/* ============================================================================ */}
        {activeView === 'formulation' && !selectedFormulation && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <Breadcrumb moduleId="cmc" viewLabel="Formulation Development" className="mb-4" />
              
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Formulation Development</h1>
                <p className="text-sm text-text-muted mt-1">Track formulation iterations from prototype to commercial</p>
              </div>

              {/* Formulation Timeline */}
              <div className="space-y-4">
                {formulationIterations.map((form, index) => (
                  <div key={form.id} onClick={() => setSelectedFormulation(form)}
                    className={`bg-surface-elevated border rounded-lg p-5 cursor-pointer transition-colors ${form.isCurrentFormulation ? 'border-accent-green' : 'border-border hover:border-accent-blue/50'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${form.isCurrentFormulation ? 'bg-accent-green text-white' : 'bg-surface-card text-text-primary'}`}>
                          {form.version}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-text-primary">{form.version}: {form.dosageForm}</h3>
                          <p className="text-sm text-text-muted">{getProductName(form.productId)} • {form.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {form.isCurrentFormulation && <Badge color="green" size="sm">Current</Badge>}
                        <Badge color={form.status === 'commercial' || form.status === 'final' ? 'green' : form.status === 'optimization' ? 'blue' : form.status === 'development' ? 'amber' : 'slate'} size="sm">{form.status}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-text-secondary mb-4">{form.description}</p>
                    
                    {/* Quick Results Summary */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-accent-green" />
                        <span className="text-text-muted">{form.testResults.filter(t => t.status === 'pass').length} Pass</span>
                      </div>
                      {form.testResults.filter(t => t.status === 'fail').length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-accent-red" />
                          <span className="text-text-muted">{form.testResults.filter(t => t.status === 'fail').length} Fail</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-accent-blue" />
                        <span className="text-text-muted">{form.composition.length} Components</span>
                      </div>
                    </div>

                    {form.issues && form.issues.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="text-xs text-text-muted mb-1">Issues Identified</div>
                        <p className="text-sm text-accent-amber">{form.issues.join('; ')}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Formulation Detail */}
        {activeView === 'formulation' && selectedFormulation && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedFormulation(null)}>Formulation Development</Button>
                <ChevronRight className="w-4 h-4" /><span className="text-text-primary">{selectedFormulation.version}</span>
              </div>
              
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">{selectedFormulation.version}: {selectedFormulation.dosageForm}</h1>
                  <p className="text-sm text-text-muted mt-1">{selectedFormulation.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedFormulation.isCurrentFormulation && <Badge color="green" size="md">Current Formulation</Badge>}
                  <Badge color={selectedFormulation.status === 'commercial' || selectedFormulation.status === 'final' ? 'green' : 'blue'} size="md">{selectedFormulation.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
                  {/* Composition */}
                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Composition</h3></CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <thead><tr className="border-b border-border bg-surface-card">
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Component</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Function</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Amount</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">%w/w</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Grade</th>
                        </tr></thead>
                        <tbody>
                          {selectedFormulation.composition.map((comp, i) => (
                            <tr key={i} className="border-b border-border/50">
                              <td className="px-4 py-2 text-sm font-medium text-text-primary">{comp.name}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{comp.function}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{comp.amount}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{comp.percentW}%</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{comp.grade}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  {/* Test Results */}
                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Test Results</h3></CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full">
                        <thead><tr className="border-b border-border bg-surface-card">
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Parameter</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Specification</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Result</th>
                          <th className="text-left px-4 py-2 text-xs text-text-muted font-medium">Status</th>
                        </tr></thead>
                        <tbody>
                          {selectedFormulation.testResults.map((test, i) => (
                            <tr key={i} className={`border-b border-border/50 ${test.status === 'fail' ? 'bg-accent-red/5' : test.status === 'marginal' ? 'bg-accent-amber/5' : ''}`}>
                              <td className="px-4 py-2 text-sm font-medium text-text-primary">{test.parameter}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{test.specification}</td>
                              <td className="px-4 py-2 text-sm text-text-secondary">{test.result}</td>
                              <td className="px-4 py-2"><Badge color={test.status === 'pass' ? 'green' : test.status === 'fail' ? 'red' : 'amber'} size="sm">{test.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4 md:space-y-6">
                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Details</h3></CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-text-muted">Product</span><span className="text-text-primary">{getProductName(selectedFormulation.productId)}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Date</span><span className="text-text-primary">{selectedFormulation.date}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Stability Studies</span><span className="text-text-primary">{selectedFormulation.linkedStabilityStudies.length}</span></div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedFormulation.issues && selectedFormulation.issues.length > 0 && (
                    <Card variant="elevated" className="border-accent-amber/30">
                      <CardHeader><h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-accent-amber" />Issues</h3></CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm text-text-secondary">
                          {selectedFormulation.issues.map((issue, i) => (<li key={i}>• {issue}</li>))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {selectedFormulation.resolution && (
                    <Card variant="elevated" className="border-accent-green/30">
                      <CardHeader><h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><CheckCircle className="w-4 h-4 text-accent-green" />Resolution</h3></CardHeader>
                      <CardContent>
                        <p className="text-sm text-text-secondary">{selectedFormulation.resolution}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================ */}
        {/* v0.8.1: TECH TRANSFER */}
        {/* ============================================================================ */}
        {activeView === 'tech-transfer' && !selectedTransfer && (
          <div className="p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <Breadcrumb moduleId="cmc" viewLabel="Tech Transfer" className="mb-4" />
              
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Technology Transfer</h1>
                <p className="text-sm text-text-muted mt-1">Site transfers, scale-up, and process validation tracking</p>
              </div>

              {/* Active Transfers */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-text-primary mb-4">Active Transfers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {techTransfers.filter(t => t.status !== 'completed').map(transfer => (
                    <div key={transfer.id} onClick={() => setSelectedTransfer(transfer)}
                      className="bg-surface-elevated border border-border rounded-lg p-5 hover:border-accent-blue/50 cursor-pointer">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center">
                            <ArrowRightLeft className="w-5 h-5 text-accent-blue" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-text-primary">{transfer.transferNumber}</h3>
                            <p className="text-xs text-text-muted">{getProductName(transfer.productId)}</p>
                          </div>
                        </div>
                        <Badge color={transfer.status === 'in-progress' ? 'blue' : transfer.status === 'qualification' ? 'purple' : 'amber'} size="sm">{transfer.status}</Badge>
                      </div>
                      <p className="text-sm text-text-secondary mb-4">{transfer.title}</p>
                      <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                        <Building2 className="w-4 h-4" />
                        <span>{transfer.sendingSite}</span>
                        <ChevronRight className="w-4 h-4" />
                        <span>{transfer.receivingSite}</span>
                      </div>
                      {/* Progress */}
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-text-muted">Phase Progress</span>
                          <span className="text-text-primary">{transfer.phases.filter(p => p.status === 'completed').length}/{transfer.phases.length}</span>
                        </div>
                        <ProgressBar value={transfer.phases.filter(p => p.status === 'completed').length} max={transfer.phases.length} size="sm" color="blue" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Completed Transfers */}
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-4">Completed Transfers</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {techTransfers.filter(t => t.status === 'completed').map(transfer => (
                    <div key={transfer.id} onClick={() => setSelectedTransfer(transfer)}
                      className="bg-surface-elevated border border-border rounded-lg p-5 hover:border-accent-green/50 cursor-pointer">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-accent-green/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-accent-green" />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-text-primary">{transfer.transferNumber}</h3>
                            <p className="text-xs text-text-muted">{getProductName(transfer.productId)}</p>
                          </div>
                        </div>
                        <Badge color="green" size="sm">completed</Badge>
                      </div>
                      <p className="text-sm text-text-secondary mb-4">{transfer.title}</p>
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Building2 className="w-4 h-4" />
                        <span>{transfer.sendingSite}</span>
                        <ChevronRight className="w-4 h-4" />
                        <span>{transfer.receivingSite}</span>
                      </div>
                      <div className="mt-3 text-xs text-text-muted">
                        Completed: {transfer.actualCompletionDate}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tech Transfer Detail */}
        {activeView === 'tech-transfer' && selectedTransfer && (
          <div className="p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
                <Button variant="ghost" size="sm" onClick={() => setSelectedTransfer(null)}>Tech Transfer</Button>
                <ChevronRight className="w-4 h-4" /><span className="text-text-primary">{selectedTransfer.transferNumber}</span>
              </div>
              
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary">{selectedTransfer.transferNumber}</h1>
                  <p className="text-sm text-text-muted mt-1">{selectedTransfer.title}</p>
                </div>
                <Badge color={selectedTransfer.status === 'completed' ? 'green' : selectedTransfer.status === 'in-progress' ? 'blue' : 'amber'} size="md">{selectedTransfer.status}</Badge>
              </div>

              {/* Transfer Route */}
              <div className="bg-surface-elevated border border-border rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-surface-card flex items-center justify-center mb-2 mx-auto">
                      <Building2 className="w-8 h-8 text-text-muted" />
                    </div>
                    <div className="text-sm font-medium text-text-primary">{selectedTransfer.sendingSite}</div>
                    <div className="text-xs text-text-muted">Sending Site</div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex-1 h-0.5 bg-border" />
                    <ArrowRightLeft className="w-8 h-8 text-accent-blue mx-4" />
                    <div className="flex-1 h-0.5 bg-border" />
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center mb-2 mx-auto">
                      <Building2 className="w-8 h-8 text-accent-green" />
                    </div>
                    <div className="text-sm font-medium text-text-primary">{selectedTransfer.receivingSite}</div>
                    <div className="text-xs text-text-muted">Receiving Site</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <div className="col-span-1 md:col-span-2 space-y-4 md:space-y-6">
                  {/* Phases */}
                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Transfer Phases</h3></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedTransfer.phases.map((phase, i) => (
                          <div key={i} className={`p-4 rounded-lg border ${phase.status === 'completed' ? 'border-accent-green/30 bg-accent-green/5' : phase.status === 'in-progress' ? 'border-accent-blue/30 bg-accent-blue/5' : 'border-border'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {phase.status === 'completed' ? <CheckCircle className="w-5 h-5 text-accent-green" /> : phase.status === 'in-progress' ? <Clock className="w-5 h-5 text-accent-blue" /> : <div className="w-5 h-5 rounded-full border-2 border-border" />}
                                <span className="font-medium text-text-primary">{phase.name}</span>
                              </div>
                              <Badge color={phase.status === 'completed' ? 'green' : phase.status === 'in-progress' ? 'blue' : 'slate'} size="sm">{phase.status}</Badge>
                            </div>
                            <div className="ml-7">
                              <div className="text-xs text-text-muted mb-2">
                                {phase.startDate && <span>Started: {phase.startDate}</span>}
                                {phase.endDate && <span className="ml-4">Completed: {phase.endDate}</span>}
                              </div>
                              <div className="text-sm text-text-secondary">
                                Deliverables: {phase.completedDeliverables}/{phase.deliverables.length} completed
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Linked DOE Studies */}
                  {selectedTransfer.linkedDOEStudies.length > 0 && (
                    <Card variant="elevated" className="border-accent-purple/30">
                      <CardHeader><h3 className="text-sm font-semibold text-text-primary flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent-purple" />R&D Connected: Linked DOE Studies</h3></CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedTransfer.linkedDOEStudies.map(doeId => {
                            const doe = getDOEStudyById(doeId);
                            return doe ? (
                              <div key={doeId} className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FlaskConical className="w-5 h-5 text-accent-purple" />
                                  <div>
                                    <div className="text-sm font-medium text-text-primary">{doe.studyNumber}</div>
                                    <div className="text-xs text-text-muted">{doe.title}</div>
                                  </div>
                                </div>
                                <Badge color="green" size="xs">completed</Badge>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4 md:space-y-6">
                  <Card variant="elevated">
                    <CardHeader><h3 className="text-sm font-semibold text-text-primary">Details</h3></CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-text-muted">Type</span><span className="text-text-primary capitalize">{selectedTransfer.type.replace('-', ' ')}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Lead</span><span className="text-text-primary">{selectedTransfer.transferLead}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Start</span><span className="text-text-primary">{selectedTransfer.startDate}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Target</span><span className="text-text-primary">{selectedTransfer.targetCompletionDate}</span></div>
                        {selectedTransfer.actualCompletionDate && (
                          <div className="flex justify-between"><span className="text-text-muted">Actual</span><span className="text-accent-green">{selectedTransfer.actualCompletionDate}</span></div>
                        )}
                        <div className="flex justify-between"><span className="text-text-muted">Risk</span><Badge color={selectedTransfer.riskAssessment === 'low' ? 'green' : selectedTransfer.riskAssessment === 'medium' ? 'amber' : 'red'} size="xs">{selectedTransfer.riskAssessment}</Badge></div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedTransfer.notes && (
                    <Card variant="elevated">
                      <CardHeader><h3 className="text-sm font-semibold text-text-primary">Notes</h3></CardHeader>
                      <CardContent>
                        <p className="text-sm text-text-secondary">{selectedTransfer.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          NEW DRUG SUBSTANCE MODAL
          ================================================================ */}
      {showNewSubstanceModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewSubstanceModal(false)} />
          <div className="relative bg-surface-elevated border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface-elevated z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-blue/20 flex items-center justify-center"><Beaker className="w-5 h-5 text-accent-blue" /></div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Register Drug Substance</h2>
                  <p className="text-xs text-text-muted">ICH M4S / CTD Module 3.2.S</p>
                </div>
              </div>
              <button onClick={() => setShowNewSubstanceModal(false)} className="w-8 h-8 rounded-lg hover:bg-surface-card flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Identity */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Identity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">INN / Proposed Name <span className="text-accent-red">*</span></label>
                    <input value={newSubstance.name} onChange={e => setNewSubstance(s => ({ ...s, name: e.target.value }))}
                      placeholder="e.g. Ligrastinib" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Generic Name (INN)</label>
                    <input value={newSubstance.genericName} onChange={e => setNewSubstance(s => ({ ...s, genericName: e.target.value }))}
                      placeholder="e.g. ligrastinib" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">CAS Number</label>
                    <input value={newSubstance.casNumber} onChange={e => setNewSubstance(s => ({ ...s, casNumber: e.target.value }))}
                      placeholder="e.g. 123456-78-9" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Molecular Formula</label>
                    <input value={newSubstance.molecularFormula} onChange={e => setNewSubstance(s => ({ ...s, molecularFormula: e.target.value }))}
                      placeholder="e.g. C₁₈H₂₁N₃O₄" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Molecular Weight (g/mol)</label>
                    <input value={newSubstance.molecularWeight} onChange={e => setNewSubstance(s => ({ ...s, molecularWeight: e.target.value }))}
                      placeholder="e.g. 347.4" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Synthesis Route</label>
                    <input value={newSubstance.synthesisRoute} onChange={e => setNewSubstance(s => ({ ...s, synthesisRoute: e.target.value }))}
                      placeholder="e.g. Chemical Synthesis" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Classification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Associated Product</label>
                    <select value={newSubstance.productId} onChange={e => setNewSubstance(s => ({ ...s, productId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brandName ? ` (${p.brandName})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Development Status</label>
                    <select value={newSubstance.status} onChange={e => setNewSubstance(s => ({ ...s, status: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      {['development', 'clinical', 'filed', 'commercial', 'discontinued'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-text-secondary mb-1">Manufacturer / Sponsor Site</label>
                    <input value={newSubstance.manufacturer} onChange={e => setNewSubstance(s => ({ ...s, manufacturer: e.target.value }))}
                      placeholder="e.g. Ligature Pharma GmbH, Frankfurt" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                </div>
              </div>

              {/* CTD Callout */}
              <div className="flex items-start gap-3 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                <Sparkles className="w-4 h-4 text-accent-blue mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary">Specifications, critical process steps, and manufacturing parameters can be added after registration. Specifications will populate <strong>CTD Module 3.2.S.4</strong>.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-surface-elevated">
              <Button variant="ghost" size="sm" onClick={() => setShowNewSubstanceModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm"
                onClick={() => {
                  if (!newSubstance.name.trim()) return;
                  // In a live system this would call an API — for now we show confirmation and close
                  setShowNewSubstanceModal(false);
                  setNewSubstance({ name: '', genericName: '', casNumber: '', molecularFormula: '', molecularWeight: '', synthesisRoute: '', status: 'development', manufacturer: '', productId: 'lig-2847' });
                }}>
                Register Substance
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          NEW DRUG PRODUCT MODAL
          ================================================================ */}
      {showNewProductModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewProductModal(false)} />
          <div className="relative bg-surface-elevated border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface-elevated z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-green/20 flex items-center justify-center"><Package className="w-5 h-5 text-accent-green" /></div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Register Drug Product</h2>
                  <p className="text-xs text-text-muted">ICH M4S / CTD Module 3.2.P</p>
                </div>
              </div>
              <button onClick={() => setShowNewProductModal(false)} className="w-8 h-8 rounded-lg hover:bg-surface-card flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">✕</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Formulation */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Formulation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Dosage Form <span className="text-accent-red">*</span></label>
                    <select value={newProduct.dosageForm} onChange={e => setNewProduct(s => ({ ...s, dosageForm: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      <option value="">Select form...</option>
                      {['Film-coated Tablet', 'Hard Capsule', 'Solution for Injection', 'Lyophilised Powder', 'Oral Solution', 'Transdermal Patch', 'Inhaler', 'Suppository'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Strength <span className="text-accent-red">*</span></label>
                    <input value={newProduct.strength} onChange={e => setNewProduct(s => ({ ...s, strength: e.target.value }))}
                      placeholder="e.g. 100 mg" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Route of Administration</label>
                    <select value={newProduct.routeOfAdministration} onChange={e => setNewProduct(s => ({ ...s, routeOfAdministration: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      <option value="">Select route...</option>
                      {['Oral', 'Intravenous', 'Subcutaneous', 'Intramuscular', 'Topical', 'Inhalation', 'Transdermal', 'Rectal'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Proposed Shelf Life</label>
                    <select value={newProduct.shelfLife} onChange={e => setNewProduct(s => ({ ...s, shelfLife: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      <option value="">Select...</option>
                      {['12 months', '18 months', '24 months', '36 months', '48 months', '60 months'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Container Closure System</label>
                    <input value={newProduct.container} onChange={e => setNewProduct(s => ({ ...s, container: e.target.value }))}
                      placeholder="e.g. HDPE bottle with child-resistant closure" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Proposed Batch Size</label>
                    <input value={newProduct.batchSize} onChange={e => setNewProduct(s => ({ ...s, batchSize: e.target.value }))}
                      placeholder="e.g. 100,000 units" className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary placeholder:text-text-muted" />
                  </div>
                </div>
              </div>

              {/* Classification */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Classification</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Associated Product</label>
                    <select value={newProduct.productId} onChange={e => setNewProduct(s => ({ ...s, productId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brandName ? ` (${p.brandName})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Development Status</label>
                    <select value={newProduct.status} onChange={e => setNewProduct(s => ({ ...s, status: e.target.value }))}
                      className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-text-primary">
                      {['development', 'clinical', 'filed', 'commercial', 'discontinued'].map(v => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* CTD Callout */}
              <div className="flex items-start gap-3 p-3 bg-accent-green/5 border border-accent-green/20 rounded-lg">
                <Sparkles className="w-4 h-4 text-accent-green mt-0.5 flex-shrink-0" />
                <p className="text-xs text-text-secondary">Composition (excipients), specifications, and stability conditions can be added after registration. Composition populates <strong>CTD Module 3.2.P.1</strong>.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-surface-elevated">
              <Button variant="ghost" size="sm" onClick={() => setShowNewProductModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm"
                onClick={() => {
                  if (!newProduct.dosageForm || !newProduct.strength) return;
                  setShowNewProductModal(false);
                  setNewProduct({ name: '', dosageForm: '', strength: '', routeOfAdministration: '', shelfLife: '', container: '', batchSize: '', status: 'development', productId: 'lig-2847' });
                }}>
                Register Product
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          v0.125.61 OVERLAYS
      ══════════════════════════════════════════════════════════ */}

      {/* ── Analytical Method Detail Slide-over ──────────────────── */}
      {selectedMethodDetail && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedMethodDetail(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-surface-elevated border-l border-border z-50 flex flex-col shadow-2xl">
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getMethodTypeBadge(selectedMethodDetail.type)}
                  {getMethodStatusBadge(selectedMethodDetail.status)}
                </div>
                <h2 className="text-lg font-semibold text-text-primary">{selectedMethodDetail.name}</h2>
                <p className="text-sm text-text-muted mt-0.5">{selectedMethodDetail.purpose}</p>
              </div>
              <button onClick={() => setSelectedMethodDetail(null)} className="p-2 hover:bg-surface-card rounded-lg text-text-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Method metadata */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Instrument', value: selectedMethodDetail.instrument || 'See SOP' },
                  { label: 'Last Validated', value: selectedMethodDetail.lastValidated || 'Pending' },
                  { label: 'Applicable To', value: selectedMethodDetail.applicableTo.join(', ').toUpperCase() },
                  { label: 'Compendial Ref', value: selectedMethodDetail.type === 'hplc' ? 'USP <621>' : selectedMethodDetail.type === 'dissolution' ? 'USP <711>' : selectedMethodDetail.type === 'gc' ? 'USP <621>' : 'ICH Q2(R1)' },
                ].map(item => (
                  <div key={item.label} className="bg-surface-card border border-border rounded-lg p-3">
                    <div className="text-xs text-text-muted mb-1">{item.label}</div>
                    <div className="text-sm text-text-primary">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* ICH Q2(R1) Validation Characteristics */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">ICH Q2(R1) Validation Characteristics</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Specificity', status: 'pass', value: 'No interference from excipients / degradants at RT ±0.5%' },
                    { name: 'Linearity', status: 'pass', value: 'R² = 0.9998 over 50–150% of target concentration' },
                    { name: 'Accuracy', status: 'pass', value: '99.2–100.8% recovery (n=9 across 3 levels)' },
                    { name: 'Repeatability', status: 'pass', value: 'RSD ≤0.3% (n=6 at 100% level)' },
                    { name: 'Intermediate Precision', status: selectedMethodDetail.status === 'validated' ? 'pass' : 'pending', value: 'RSD ≤0.5% (3 analysts × 2 days)' },
                    { name: 'Robustness', status: selectedMethodDetail.status === 'validated' ? 'pass' : 'in-progress', value: 'Flow rate ±0.1 mL/min, column temp ±5°C, pH ±0.1' },
                    { name: 'LOD / LOQ', status: selectedMethodDetail.type === 'hplc' ? 'pass' : 'na', value: selectedMethodDetail.type === 'hplc' ? 'LOD 0.005%, LOQ 0.01%' : 'N/A for this method type' },
                  ].map(item => (
                    <div key={item.name} className="flex items-start gap-3 p-3 bg-surface-card rounded-lg">
                      <div className="mt-0.5">
                        {item.status === 'pass' ? <CheckCircle className="w-4 h-4 text-accent-green" /> :
                         item.status === 'pending' ? <Clock className="w-4 h-4 text-accent-amber" /> :
                         item.status === 'in-progress' ? <RefreshCw className="w-4 h-4 text-accent-blue" /> :
                         <span className="text-xs text-text-muted">—</span>}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{item.name}</div>
                        <div className="text-xs text-text-secondary mt-0.5">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Suitability */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">System Suitability Criteria</h3>
                <div className="bg-surface-card border border-border rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-muted">Tailing Factor</span><span className="text-text-primary">≤ 2.0</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Theoretical Plates</span><span className="text-text-primary">≥ 2000</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">RSD (reference standard)</span><span className="text-text-primary">≤ 2.0% (n=5)</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Resolution (if applicable)</span><span className="text-text-primary">≥ 2.0</span></div>
                </div>
              </div>

              {/* Regulatory references */}
              <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-4">
                <div className="text-xs font-semibold text-text-muted mb-2">Regulatory References</div>
                <div className="space-y-1 text-xs text-text-secondary">
                  <div>ICH Q2(R1): Validation of Analytical Procedures (2005)</div>
                  <div>21 CFR 211.194: Laboratory records</div>
                  <div>EU GMP Annex 11: Computerised systems</div>
                  {selectedMethodDetail.type === 'hplc' && <div>USP &lt;621&gt; Chromatography</div>}
                  {selectedMethodDetail.type === 'dissolution' && <div>USP &lt;711&gt; Dissolution</div>}
                </div>
              </div>

              {/* v0.125.75: eCTD Dual-Rep — Analytical Method Report */}
              <DualRepDocumentBlock
                packageTitle="Analytical Method Document Package"
                docs={[
                  { label: 'Method Validation Report', ectdPath: `m3/32-body-data/323-mfg/3239-novel-excip/${selectedMethodDetail.id}-MVR.pdf`, type: 'method', sampleUrl: 'https://database.ich.org/sites/default/files/Q2%28R1%29%20Guideline.pdf' },
                  { label: 'Method Development Summary', ectdPath: `m3/32-body-data/323-mfg/3239-novel-excip/${selectedMethodDetail.id}-MDS.pdf`, type: 'method', sampleUrl: 'https://database.ich.org/sites/default/files/Q2%28R1%29%20Guideline.pdf' },
                  { label: 'Standard Operating Procedure', ectdPath: `m3/32-body-data/323-mfg/3239-novel-excip/${selectedMethodDetail.id}-SOP.pdf`, type: 'protocol', sampleUrl: 'https://www.fda.gov/media/76741/download' },
                ]}
                ectdMeta={{ module: 'Module 3.2', section: '3.2.S.4 / 3.2.P.5 — Control of Drug Substance / Drug Product', ichReference: 'ICH Q2(R1), Q6A' }}
                structuredDataNote="Validation characteristics (specificity, linearity, accuracy, precision, LOD/LOQ, robustness), system suitability criteria, and instrument qualification records are stored as structured data in Ligature. This enables cross-method comparison, lifecycle transfer tracking, and direct feeding into CTD sections. The validation report document is the regulatory master; structured data enables the quality intelligence layer."
              />

            </div>
          </div>
        </>
      )}

      {/* ── Batch Release E-sig Modal ─────────────────────────────── */}
      {releasingBatch && (() => {
        const allPass = releasingBatch.results.every(r => r.status === 'pass');
        return (
          <>
            <div className="fixed inset-0 bg-black/60 z-50" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">Batch Release</h2>
                    <p className="text-sm text-text-muted mt-0.5">{releasingBatch.batchNumber} · {getProductName(releasingBatch.productId)}</p>
                  </div>
                  <button onClick={() => setReleasingBatch(null)} className="p-2 hover:bg-surface-card rounded-lg text-text-muted"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-5">
                  {releaseStep === 'confirm' && (
                    <>
                      <div className={`p-4 rounded-lg border ${allPass ? 'bg-accent-green/5 border-accent-green/20' : 'bg-accent-red/5 border-accent-red/20'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {allPass ? <CheckCircle className="w-4 h-4 text-accent-green" /> : <AlertTriangle className="w-4 h-4 text-accent-red" />}
                          <span className="text-sm font-semibold text-text-primary">{allPass ? 'All tests pass — batch qualifies for release' : 'One or more tests failed — review required'}</span>
                        </div>
                        <div className="text-xs text-text-secondary">
                          {releasingBatch.results.length} tests · {releasingBatch.results.filter(r => r.status === 'pass').length} passed · {releasingBatch.results.filter(r => r.status !== 'pass').length} failed
                        </div>
                      </div>
                      <div className="text-xs text-text-secondary bg-surface-card border border-border rounded-lg p-3 space-y-1">
                        <div><span className="text-text-muted">Scale:</span> {releasingBatch.batchScale}</div>
                        <div><span className="text-text-muted">Size:</span> {releasingBatch.batchSize}</div>
                        <div><span className="text-text-muted">Manufactured:</span> {releasingBatch.manufactureDate}</div>
                        <div><span className="text-text-muted">Site:</span> {getSiteById(releasingBatch.manufacturingSite)?.name || releasingBatch.manufacturingSite}</div>
                      </div>
                      <p className="text-xs text-text-muted">By proceeding, the Qualified Person (QP) confirms that the batch has been manufactured and tested in accordance with the requirements of the Marketing Authorisation and EU GMP Directive 2001/83/EC, Annex 16.</p>
                      <div className="flex gap-3">
                        <button onClick={() => setReleasingBatch(null)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary">Cancel</button>
                        <button onClick={() => setReleaseStep('pin')} disabled={!allPass} className="flex-1 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 disabled:opacity-50">Continue to QP Sign-off</button>
                      </div>
                    </>
                  )}

                  {releaseStep === 'pin' && (
                    <>
                      <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-4 h-4 text-accent-blue" />
                          <span className="text-sm font-semibold text-text-primary">Qualified Person Electronic Signature</span>
                        </div>
                        <p className="text-xs text-text-secondary">In accordance with 21 CFR Part 11 and EU GMP Annex 11. The QP certifies that the batch meets all specifications and is suitable for its intended use.</p>
                      </div>
                      <div className="text-xs space-y-1">
                        <div><span className="text-text-muted">Role:</span> <span className="text-text-primary font-medium">Qualified Person (QP)</span></div>
                        <div><span className="text-text-muted">Meaning:</span> <span className="text-text-primary">Batch released for distribution in accordance with MA/IND requirements</span></div>
                        <div><span className="text-text-muted">Date:</span> <span className="text-text-primary">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-muted block mb-1">QP PIN</label>
                        <input
                          type="password"
                          value={releasePin}
                          onChange={e => { setReleasePin(e.target.value); setReleasePinError(''); }}
                          placeholder="Enter 4-digit PIN"
                          maxLength={4}
                          className={`w-full bg-surface-card border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none ${releasePinError ? 'border-accent-red' : 'border-border focus:border-accent-blue/60'}`}
                        />
                        {releasePinError && <p className="text-xs text-accent-red mt-1">{releasePinError}</p>}
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setReleaseStep('confirm')} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary">Back</button>
                        <button
                          disabled={releasePin.length !== 4}
                          onClick={() => {
                            if (releasePin !== '1234') { setReleasePinError('Incorrect PIN.'); return; }
                            setReleasedBatchIds(prev => new Set([...prev, releasingBatch.id]));
                            setReleaseStep('done');
                          }}
                          className="flex-1 px-4 py-2 bg-accent-green text-white rounded-lg text-sm hover:bg-accent-green/90 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Lock className="w-4 h-4" />Certify & Release
                        </button>
                      </div>
                    </>
                  )}

                  {releaseStep === 'done' && (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-accent-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-accent-green" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1">Batch Released</h3>
                      <p className="text-sm text-text-muted mb-1">{releasingBatch.batchNumber} certified for distribution.</p>
                      <p className="text-xs text-text-muted font-mono">QP e-sig · sha256: {btoa(releasingBatch.id + ':qp:' + Date.now()).slice(0, 32)}...</p>
                      <button onClick={() => setReleasingBatch(null)} className="mt-4 px-6 py-2 bg-accent-green text-white rounded-lg text-sm">Done</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

    </div>
  );
}
