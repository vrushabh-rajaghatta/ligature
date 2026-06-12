
// ============================================================================
// PSMF Screen - v0.13.64: Pharmacovigilance System Master File
// ============================================================================
// EU GVP Module II compliant PSMF management interface
// Integrated with Safety & PV module for complete pharmacovigilance story
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import {
  Shield, FileText, Users, Server, ClipboardCheck, Building, Package,
  Search, Plus, ChevronRight, CheckCircle, AlertTriangle, Clock, X,
  User, Mail, Phone, MapPin, Calendar, ExternalLink, Eye, Edit,
  BarChart3, TrendingUp, AlertCircle, FileCheck, Settings, History,
  Globe, BookOpen, Activity, Layers, Database, RefreshCw, Download,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import { usePSMFStore } from '@/store/usePSMFStore';
import {
  mockQPPVs, mockOrgUnits, mockSystems, mockSOPs, mockAudits,
  mockProviders, mockAuthorizedProducts, mockPSMFDocument,
} from '@/data/psmf-data';
import type {
  PSMFView, QPPV, OrganizationalUnit, ComputerizedSystem, SOP,
  PVAudit, AuditFinding, ServiceProvider, AuthorizedProduct,
  PSMFComplianceMetrics, SOPCategory, SystemCategory, FindingSeverity,
} from '@/store/psmfTypes';
// v0.14.6: Document Lineage Provenance for SOPs
import { PSMFProvenanceIndicator, PSMFComplianceAlert, AnnexCLineageSummary } from '@/components/psmf/PSMFProvenanceIndicator';
// v0.15.1: Document Number Link to source
import { LineageAwareDocumentLink } from '@/components/documents/DocumentNumberLink';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// COLOR MAPS
// ============================================================================

const statusColorMap: Record<string, 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple'> = {
  active: 'green',
  operational: 'green',
  effective: 'green',
  validated: 'green',
  qualified: 'green',
  completed: 'green',
  closed: 'green',
  marketed: 'green',
  
  'in-progress': 'blue',
  draft: 'blue',
  review: 'blue',
  'under-review': 'blue',
  planned: 'blue',
  'not-yet-marketed': 'blue',
  
  'pending-validation': 'amber',
  'validation-in-progress': 'amber',
  'requires-requalification': 'amber',
  'revalidation-required': 'amber',
  pending: 'amber',
  'pending-appointment': 'amber',
  temporary: 'amber',
  open: 'amber',
  
  expired: 'red',
  terminated: 'red',
  decommissioned: 'red',
  superseded: 'gray',
  retired: 'gray',
  departed: 'gray',
  withdrawn: 'red',
  suspended: 'red',
  cancelled: 'gray',
};

const severityColorMap: Record<FindingSeverity, 'red' | 'amber' | 'blue' | 'gray'> = {
  critical: 'red',
  major: 'amber',
  minor: 'blue',
  observation: 'gray',
};

const categoryIcons: Record<string, React.ReactNode> = {
  'safety-database': <Database className="w-4 h-4" />,
  'signal-detection': <Activity className="w-4 h-4" />,
  'aggregate-reporting': <BarChart3 className="w-4 h-4" />,
  'literature-monitoring': <BookOpen className="w-4 h-4" />,
  'document-management': <FileText className="w-4 h-4" />,
  'training-management': <Users className="w-4 h-4" />,
  'quality-management': <ClipboardCheck className="w-4 h-4" />,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PSMFScreen() {
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<PSMFView>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  // Initialize store with mock data on mount
  const store = usePSMFStore();
  
  useEffect(() => {
    // Load mock data into store
    if (Object.keys(store.qppvs).length === 0) {
      mockQPPVs.forEach(q => {
        store.qppvs[q.id] = q;
      });
      mockOrgUnits.forEach(o => {
        store.organizationalUnits[o.id] = o;
      });
      mockSystems.forEach(s => {
        store.computerizedSystems[s.id] = s;
      });
      mockSOPs.forEach(s => {
        store.sops[s.id] = s;
      });
      mockAudits.forEach(a => {
        store.audits[a.id] = a;
      });
      mockProviders.forEach(p => {
        store.serviceProviders[p.id] = p;
      });
      mockAuthorizedProducts.forEach(p => {
        store.authorizedProducts[p.id] = p;
      });
      store.psmfDocuments[mockPSMFDocument.id] = mockPSMFDocument;
      store.activePsmfId = mockPSMFDocument.id;
    }
  }, []);
  
  // Calculate compliance metrics
  const metrics = useMemo(() => {
    const qppvList = mockQPPVs;
    const systems = mockSystems;
    const sops = mockSOPs;
    const audits = mockAudits;
    const providers = mockProviders;
    const products = mockAuthorizedProducts;
    
    const primaryQppv = qppvList.find(q => q.type === 'primary' && q.status === 'active');
    const deputyQppv = qppvList.find(q => q.type === 'deputy' && q.status === 'active');
    
    const today = new Date();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const validatedSystems = systems.filter(s => s.validationStatus === 'validated').length;
    const systemsNeedingRevalidation = systems.filter(s => 
      s.nextRevalidationDate && new Date(s.nextRevalidationDate) < thirtyDays
    ).length;
    
    const effectiveSOPs = sops.filter(s => s.status === 'effective').length;
    const sopsNeedingReview = sops.filter(s => 
      s.nextReviewDate && new Date(s.nextReviewDate) < thirtyDays
    ).length;
    
    const allFindings = audits.flatMap(a => a.findings);
    const openFindings = allFindings.filter(f => f.status !== 'closed').length;
    const criticalFindings = allFindings.filter(f => f.severity === 'critical' && f.status !== 'closed').length;
    
    const qualifiedProviders = providers.filter(p => p.qualificationStatus === 'qualified').length;
    const productsCovered = products.filter(p => p.includedInPSMF).length;
    
    // Calculate score
    let score = 0;
    if (primaryQppv) score += 20;
    if (deputyQppv) score += 5;
    score += (validatedSystems / Math.max(systems.length, 1)) * 20;
    score += (effectiveSOPs / Math.max(sops.length, 1)) * 20;
    score += criticalFindings === 0 ? 15 : 0;
    score += openFindings <= 3 ? 10 : 5;
    score += (qualifiedProviders / Math.max(providers.length, 1)) * 10;
    
    return {
      qppvInPlace: !!primaryQppv,
      deputyAvailable: !!deputyQppv,
      totalSystems: systems.length,
      validatedSystems,
      systemsNeedingRevalidation,
      totalSOPs: sops.length,
      effectiveSOPs,
      sopsNeedingReview,
      totalAudits: audits.length,
      openFindings,
      criticalFindings,
      totalProviders: providers.length,
      qualifiedProviders,
      totalProducts: products.length,
      productsCovered,
      overallScore: Math.round(score),
    };
  }, []);

  // View tabs
  const viewTabs: { id: PSMFView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'qppv', label: 'QPPV', icon: <User className="w-4 h-4" /> },
    { id: 'systems', label: 'Systems', icon: <Server className="w-4 h-4" /> },
    { id: 'processes', label: 'SOPs', icon: <FileText className="w-4 h-4" /> },
    { id: 'audits', label: 'Audits', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'providers', label: 'Providers', icon: <Building className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader
        moduleId="psmf"
        title="PV System Master File"
        subtitle="EU GVP Module II compliance documentation and pharmacovigilance system oversight"
        icon={<Shield className="w-5 h-5" />}
        badge={{ label: `Compliance: ${metrics.overallScore}%`, color: metrics.overallScore >= 80 ? 'green' : metrics.overallScore >= 60 ? 'amber' : 'red' }}
        actions={
          <Button variant="ghost" size="sm" onClick={() => toast.success('PSMF record updated — EU GMP Annex 11 audit trail stamped')}>
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export PSMF</span>
          </Button>
        }
      >
        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto scrollbar-hide scroll-fade-right -mb-3">
          {viewTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${activeView === tab.id 
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </ScreenHeader>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeView === 'dashboard' && <DashboardView metrics={metrics} setActiveView={setActiveView} />}
        {activeView === 'qppv' && <QPPVView qppvs={mockQPPVs} orgUnits={mockOrgUnits} />}
        {activeView === 'systems' && <SystemsView systems={mockSystems} />}
        {activeView === 'processes' && <SOPsView sops={mockSOPs} />}
        {activeView === 'audits' && <AuditsView audits={mockAudits} />}
        {activeView === 'providers' && <ProvidersView providers={mockProviders} />}
        {activeView === 'products' && <ProductsView products={mockAuthorizedProducts} />}
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

interface DashboardViewProps {
  metrics: {
    qppvInPlace: boolean;
    deputyAvailable: boolean;
    totalSystems: number;
    validatedSystems: number;
    systemsNeedingRevalidation: number;
    totalSOPs: number;
    effectiveSOPs: number;
    sopsNeedingReview: number;
    totalAudits: number;
    openFindings: number;
    criticalFindings: number;
    totalProviders: number;
    qualifiedProviders: number;
    totalProducts: number;
    productsCovered: number;
    overallScore: number;
  };
  setActiveView: (view: PSMFView) => void;
}

function DashboardView({ metrics, setActiveView }: DashboardViewProps) {
  const psmf = mockPSMFDocument;
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Compliance Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">PSMF Compliance Overview</h3>
            <Badge color={metrics.overallScore >= 80 ? 'green' : metrics.overallScore >= 60 ? 'amber' : 'red'}>
              {metrics.overallScore >= 80 ? 'Compliant' : metrics.overallScore >= 60 ? 'Attention Needed' : 'Non-Compliant'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-secondary">Overall Compliance Score</span>
              <span className="font-semibold text-text-primary">{metrics.overallScore}%</span>
            </div>
            <ProgressBar 
              value={metrics.overallScore} 
              max={100} 
              color={metrics.overallScore >= 80 ? 'green' : metrics.overallScore >= 60 ? 'amber' : 'red'} 
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-surface-hover">
              <div className="flex items-center gap-2 mb-1">
                {metrics.qppvInPlace ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="font-medium">QPPV</span>
              </div>
              <p className="text-text-muted">{metrics.qppvInPlace ? 'In Place' : 'Not Assigned'}</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-hover">
              <div className="flex items-center gap-2 mb-1">
                {metrics.criticalFindings === 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className="font-medium">Findings</span>
              </div>
              <p className="text-text-muted">
                {metrics.criticalFindings > 0 ? `${metrics.criticalFindings} Critical` : `${metrics.openFindings} Open`}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-surface-hover">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Systems</span>
              </div>
              <p className="text-text-muted">{metrics.validatedSystems}/{metrics.totalSystems} Validated</p>
            </div>
            <div className="p-3 rounded-lg bg-surface-hover">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="font-medium">SOPs</span>
              </div>
              <p className="text-text-muted">{metrics.effectiveSOPs}/{metrics.totalSOPs} Effective</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PSMF Document Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">PSMF Document</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Version</span>
                <span className="font-medium">{psmf.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Status</span>
                <Badge color="green">{psmf.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Effective Date</span>
                <span className="font-medium">{psmf.effectiveDate ? new Date(psmf.effectiveDate).toLocaleDateString() : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">QPPV Sign-off</span>
                <span className="font-medium">{psmf.qppvSignoffDate ? new Date(psmf.qppvSignoffDate).toLocaleDateString() : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Next Review</span>
                <span className="font-medium">{psmf.nextReviewDate ? new Date(psmf.nextReviewDate).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary">Section Status</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {(psmf.sections ?? []).map(section => (
                <div key={section.section} className="flex items-center justify-between py-1">
                  <span className="text-sm text-text-secondary truncate flex-1">{section.title}</span>
                  <Badge 
                    color={section.status === 'current' ? 'green' : section.status === 'under-review' ? 'blue' : 'amber'}
                    size="sm"
                  >
                    {section.status === 'current' ? 'Current' : section.status === 'under-review' ? 'Review' : 'Update'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Computerized Systems"
          value={metrics.totalSystems}
          icon={<Server className="w-5 h-5" />}
          color="blue"
          onClick={() => setActiveView('systems')}
        >
          <span className="text-xs text-text-muted">{metrics.validatedSystems} validated</span>
        </StatCard>
        <StatCard
          label="SOPs"
          value={metrics.totalSOPs}
          icon={<FileText className="w-5 h-5" />}
          color="purple"
          onClick={() => setActiveView('processes')}
        >
          <span className="text-xs text-text-muted">{metrics.sopsNeedingReview} need review</span>
        </StatCard>
        <StatCard
          label="Service Providers"
          value={metrics.totalProviders}
          icon={<Building className="w-5 h-5" />}
          color="amber"
          onClick={() => setActiveView('providers')}
        >
          <span className="text-xs text-text-muted">{metrics.qualifiedProviders} qualified</span>
        </StatCard>
        <StatCard
          label="Products Covered"
          value={metrics.productsCovered}
          icon={<Package className="w-5 h-5" />}
          color="green"
          onClick={() => setActiveView('products')}
        >
          <span className="text-xs text-text-muted">of {metrics.totalProducts} total</span>
        </StatCard>
      </div>

      {/* Alerts */}
      {(metrics.criticalFindings > 0 || metrics.sopsNeedingReview > 0 || metrics.systemsNeedingRevalidation > 0) && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Action Items
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.criticalFindings > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>{metrics.criticalFindings} critical audit finding(s) require immediate attention</span>
                  <Button variant="link" size="sm" onClick={() => setActiveView('audits')}>View</Button>
                </div>
              )}
              {metrics.sopsNeedingReview > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                  <span>{metrics.sopsNeedingReview} SOP(s) due for periodic review</span>
                  <Button variant="link" size="sm" onClick={() => setActiveView('processes')}>View</Button>
                </div>
              )}
              {metrics.systemsNeedingRevalidation > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <RefreshCw className="w-5 h-5" />
                  <span>{metrics.systemsNeedingRevalidation} system(s) approaching revalidation date</span>
                  <Button variant="link" size="sm" onClick={() => setActiveView('systems')}>View</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// QPPV VIEW
// ============================================================================

interface QPPVViewProps {
  qppvs: QPPV[];
  orgUnits: OrganizationalUnit[];
}

function QPPVView({ qppvs, orgUnits }: QPPVViewProps) {
  const [selectedQppv, setSelectedQppv] = useState<QPPV | null>(null);
  
  const primaryQppv = qppvs.find(q => q.type === 'primary');
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Primary QPPV Card */}
      {primaryQppv && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">EU Qualified Person for Pharmacovigilance</h3>
              <Badge color={primaryQppv.status === 'active' ? 'green' : 'amber'}>{primaryQppv.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
                <User className="w-8 h-8 text-violet-500" />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-lg font-semibold text-text-primary">
                    {primaryQppv.title} {primaryQppv.firstName} {primaryQppv.lastName}
                  </h4>
                  <p className="text-text-secondary">{primaryQppv.qualifications.join(', ')}</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${primaryQppv.email}`} className="hover:text-text-primary">{primaryQppv.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <Phone className="w-4 h-4" />
                      <span>{primaryQppv.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-text-secondary">
                      <MapPin className="w-4 h-4" />
                      <span>{primaryQppv.city}, {primaryQppv.country}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Organization</span>
                    <span className="font-medium">{primaryQppv.organization}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Availability</span>
                    <span className="font-medium">{primaryQppv.availabilityHours}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Appointed</span>
                    <span className="font-medium">{new Date(primaryQppv.appointmentDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Last Training</span>
                    <span className="font-medium">{primaryQppv.lastTrainingDate ? new Date(primaryQppv.lastTrainingDate).toLocaleDateString() : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">EU Resident</span>
                    <span className="font-medium">{primaryQppv.euResident ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deputy & Backup QPPVs */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">Deputy & Backup Personnel</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qppvs.filter(q => q.type !== 'primary').map(qppv => (
              <div key={qppv.id} className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <Badge color={qppv.type === 'deputy' ? 'blue' : 'gray'}>{qppv.type}</Badge>
                  <Badge color={qppv.status === 'active' ? 'green' : 'amber'} size="sm">{qppv.status}</Badge>
                </div>
                <h4 className="font-medium text-text-primary">{qppv.title} {qppv.firstName} {qppv.lastName}</h4>
                <p className="text-sm text-text-secondary">{qppv.qualifications.join(', ')}</p>
                <div className="mt-2 text-sm text-text-muted">
                  <span>{qppv.email}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Organizational Structure */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary">PV Organizational Structure</h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orgUnits.map(unit => (
              <div key={unit.id} className={`p-4 rounded-lg border border-border ${unit.parentId ? 'ml-6' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {unit.type === 'external' ? (
                      <Building className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Users className="w-5 h-5 text-violet-500" />
                    )}
                    <div>
                      <h4 className="font-medium text-text-primary">{unit.name}</h4>
                      <p className="text-sm text-text-secondary">{unit.headName} - {unit.headTitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge color={unit.type === 'external' ? 'amber' : 'blue'} size="sm">{unit.type}</Badge>
                    <p className="text-sm text-text-muted mt-1">{unit.ftePV} PV FTE</p>
                  </div>
                </div>
                {unit.pvResponsibilities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {unit.pvResponsibilities.slice(0, 3).map((resp, i) => (
                      <span key={i} className="text-xs px-2 py-1 rounded-full bg-surface-hover text-text-secondary">
                        {resp}
                      </span>
                    ))}
                    {unit.pvResponsibilities.length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-surface-hover text-text-muted">
                        +{unit.pvResponsibilities.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// SYSTEMS VIEW
// ============================================================================

interface SystemsViewProps {
  systems: ComputerizedSystem[];
}

function SystemsView({ systems }: SystemsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = ['all', ...Array.from(new Set(systems.map(s => s.category)))];
  const filteredSystems = selectedCategory === 'all' 
    ? systems 
    : systems.filter(s => s.category === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {cat === 'all' ? 'All Systems' : cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Systems Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredSystems.map(system => (
          <Card key={system.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    {categoryIcons[system.category] || <Server className="w-5 h-5 text-blue-500" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary">{system.name}</h4>
                    <p className="text-sm text-text-secondary">{system.vendor} v{system.version}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={statusColorMap[system.status] || 'gray'} size="sm">{system.status}</Badge>
                  <Badge color={statusColorMap[system.validationStatus] || 'gray'} size="sm">{system.validationStatus}</Badge>
                </div>
              </div>
              
              <p className="text-sm text-text-muted mb-3 line-clamp-2">{system.description}</p>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-text-secondary">
                  <Globe className="w-3 h-3" />
                  <span>{system.hostingType}</span>
                </div>
                <div className="flex items-center gap-1 text-text-secondary">
                  <MapPin className="w-3 h-3" />
                  <span>{system.hostingLocation || 'N/A'}</span>
                </div>
                {system.part11Compliant && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>21 CFR Part 11</span>
                  </div>
                )}
                {system.annex11Compliant && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>Annex 11</span>
                  </div>
                )}
              </div>
              
              {system.nextRevalidationDate && (
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Next Revalidation</span>
                  <span className={`font-medium ${
                    new Date(system.nextRevalidationDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                      ? 'text-amber-500'
                      : 'text-text-primary'
                  }`}>
                    {new Date(system.nextRevalidationDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SOPs VIEW
// ============================================================================

interface SOPsViewProps {
  sops: SOP[];
}

function SOPsView({ sops }: SOPsViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const filteredSOPs = selectedStatus === 'all'
    ? sops
    : sops.filter(s => s.status === selectedStatus);
  
  const today = new Date();
  const needsReview = sops.filter(s => s.nextReviewDate && new Date(s.nextReviewDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-4">
      {/* v0.14.6: Compliance Alert for stale SOPs */}
      <PSMFComplianceAlert />
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-text-primary">{sops.length}</p>
          <p className="text-sm text-text-secondary">Total SOPs</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-green-500">{sops.filter(s => s.status === 'effective').length}</p>
          <p className="text-sm text-text-secondary">Effective</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-amber-500">{needsReview.length}</p>
          <p className="text-sm text-text-secondary">Due for Review</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-blue-500">{sops.filter(s => s.status === 'draft' || s.status === 'review').length}</p>
          <p className="text-sm text-text-secondary">In Progress</p>
        </div>
      </div>

      {/* Filter + Lineage Summary */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['all', 'effective', 'draft', 'review'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        {/* v0.14.6: Lineage summary */}
        <AnnexCLineageSummary totalSOPs={sops.length} />
      </div>

      {/* SOPs Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-hover">
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Document #</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Title</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Category</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Version</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Next Review</th>
                </tr>
              </thead>
              <tbody>
                {filteredSOPs.map(sop => {
                  const reviewSoon = sop.nextReviewDate && new Date(sop.nextReviewDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={sop.id} className="border-b border-border hover:bg-surface-hover">
                      <td className="p-3">
                        {/* v0.15.1: Document Number links to Document Control source */}
                        <LineageAwareDocumentLink
                          documentNumber={sop.documentNumber}
                          documentId={sop.id}
                          module="psmf"
                        />
                      </td>
                      <td className="p-3 text-sm text-text-primary">{sop.title}</td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-1 rounded-full bg-surface-hover text-text-secondary">
                          {sop.category.replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        {/* v0.14.6: Document Lineage Provenance */}
                        <PSMFProvenanceIndicator
                          sopId={sop.id}
                          sopDocumentNumber={sop.documentNumber}
                          sopVersion={sop.version}
                          sopTitle={sop.title}
                        />
                      </td>
                      <td className="p-3">
                        <Badge color={statusColorMap[sop.status] || 'gray'} size="sm">{sop.status}</Badge>
                      </td>
                      <td className="p-3 text-sm">
                        <span className={reviewSoon ? 'text-amber-500 font-medium' : 'text-text-secondary'}>
                          {sop.nextReviewDate ? new Date(sop.nextReviewDate).toLocaleDateString() : '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// AUDITS VIEW
// ============================================================================

interface AuditsViewProps {
  audits: PVAudit[];
}

function AuditsView({ audits }: AuditsViewProps) {
  const [selectedAudit, setSelectedAudit] = useState<PVAudit | null>(null);
  
  const allFindings = audits.flatMap(a => a.findings);
  const openFindings = allFindings.filter(f => f.status !== 'closed');
  const criticalFindings = openFindings.filter(f => f.severity === 'critical');

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-text-primary">{audits.length}</p>
          <p className="text-sm text-text-secondary">Total Audits</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-green-500">{audits.filter(a => a.status === 'completed').length}</p>
          <p className="text-sm text-text-secondary">Completed</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-amber-500">{openFindings.length}</p>
          <p className="text-sm text-text-secondary">Open Findings</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-red-500">{criticalFindings.length}</p>
          <p className="text-sm text-text-secondary">Critical</p>
        </div>
      </div>

      {/* Audits List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {audits.map(audit => (
          <Card key={audit.id} className="cursor-pointer hover:border-violet-500/50 transition-colors" onClick={() => setSelectedAudit(audit)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-text-primary">{audit.title}</h4>
                  <p className="text-sm text-text-secondary">{audit.auditNumber}</p>
                </div>
                <Badge color={statusColorMap[audit.status] || 'gray'}>{audit.status}</Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Calendar className="w-4 h-4" />
                  <span>{audit.plannedStartDate} - {audit.plannedEndDate}</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <User className="w-4 h-4" />
                  <span>{audit.leadAuditor}</span>
                </div>
              </div>
              
              {audit.findings.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex gap-2">
                  {audit.findings.filter(f => f.severity === 'critical').length > 0 && (
                    <Badge color="red" size="sm">
                      {audit.findings.filter(f => f.severity === 'critical').length} Critical
                    </Badge>
                  )}
                  {audit.findings.filter(f => f.severity === 'major').length > 0 && (
                    <Badge color="amber" size="sm">
                      {audit.findings.filter(f => f.severity === 'major').length} Major
                    </Badge>
                  )}
                  {audit.findings.filter(f => f.severity === 'minor').length > 0 && (
                    <Badge color="blue" size="sm">
                      {audit.findings.filter(f => f.severity === 'minor').length} Minor
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Audit Detail Modal */}
      {selectedAudit && (
        <Modal isOpen onClose={() => setSelectedAudit(null)} title={selectedAudit.title}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
              <div>
                <span className="text-text-secondary">Type:</span>
                <span className="ml-2 font-medium">{selectedAudit.type}</span>
              </div>
              <div>
                <span className="text-text-secondary">Status:</span>
                <Badge color={statusColorMap[selectedAudit.status] || 'gray'} className="ml-2">{selectedAudit.status}</Badge>
              </div>
              <div>
                <span className="text-text-secondary">Lead Auditor:</span>
                <span className="ml-2 font-medium">{selectedAudit.leadAuditor}</span>
              </div>
              <div>
                <span className="text-text-secondary">Date:</span>
                <span className="ml-2 font-medium">{selectedAudit.actualStartDate || selectedAudit.plannedStartDate}</span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-text-secondary mb-1">Scope</p>
              <p className="text-sm">{selectedAudit.scope}</p>
            </div>
            
            {selectedAudit.findings.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Findings ({selectedAudit.findings.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedAudit.findings.map(finding => (
                    <div key={finding.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm">{finding.findingNumber}</span>
                        <div className="flex gap-2">
                          <Badge color={severityColorMap[finding.severity]} size="sm">{finding.severity}</Badge>
                          <Badge color={statusColorMap[finding.status] || 'gray'} size="sm">{finding.status}</Badge>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{finding.title}</p>
                      <p className="text-sm text-text-muted mt-1">{finding.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedAudit.overallConclusion && (
              <div>
                <p className="text-sm text-text-secondary mb-1">Conclusion</p>
                <p className="text-sm">{selectedAudit.overallConclusion}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// PROVIDERS VIEW
// ============================================================================

interface ProvidersViewProps {
  providers: ServiceProvider[];
}

function ProvidersView({ providers }: ProvidersViewProps) {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-text-primary">{providers.length}</p>
          <p className="text-sm text-text-secondary">Total Providers</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-green-500">{providers.filter(p => p.qualificationStatus === 'qualified').length}</p>
          <p className="text-sm text-text-secondary">Qualified</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-blue-500">{providers.filter(p => p.contractStatus === 'active').length}</p>
          <p className="text-sm text-text-secondary">Active Contracts</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-violet-500">{providers.filter(p => p.sdeaRequired && p.sdeaReference).length}</p>
          <p className="text-sm text-text-secondary">Active SDEAs</p>
        </div>
      </div>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {providers.map(provider => (
          <Card key={provider.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Building className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary">{provider.name}</h4>
                    <p className="text-sm text-text-secondary">{provider.type.replace(/-/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge color={statusColorMap[provider.contractStatus] || 'gray'} size="sm">{provider.contractStatus}</Badge>
                  <Badge color={statusColorMap[provider.qualificationStatus] || 'gray'} size="sm">{provider.qualificationStatus}</Badge>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-text-secondary">
                  <User className="w-4 h-4" />
                  <span>{provider.primaryContact}</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <Mail className="w-4 h-4" />
                  <span>{provider.contactEmail}</span>
                </div>
                <div className="flex items-center gap-2 text-text-secondary">
                  <MapPin className="w-4 h-4" />
                  <span>{provider.country}</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex flex-wrap gap-1">
                  {provider.servicesProvided.slice(0, 2).map((service, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-surface-hover text-text-secondary">
                      {service}
                    </span>
                  ))}
                  {provider.servicesProvided.length > 2 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-surface-hover text-text-muted">
                      +{provider.servicesProvided.length - 2}
                    </span>
                  )}
                </div>
              </div>
              
              {provider.sdeaRequired && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {provider.sdeaReference ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      SDEA: {provider.sdeaReference}
                    </span>
                  ) : (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      SDEA Required
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PRODUCTS VIEW
// ============================================================================

interface ProductsViewProps {
  products: AuthorizedProduct[];
}

function ProductsView({ products }: ProductsViewProps) {
  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-text-primary">{products.length}</p>
          <p className="text-sm text-text-secondary">Total Products</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-green-500">{products.filter(p => p.includedInPSMF).length}</p>
          <p className="text-sm text-text-secondary">In PSMF</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-blue-500">{products.filter(p => p.marketingStatus === 'marketed').length}</p>
          <p className="text-sm text-text-secondary">Marketed</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <p className="text-2xl font-semibold text-violet-500">{products.filter(p => p.rmpRequired).length}</p>
          <p className="text-sm text-text-secondary">With RMP</p>
        </div>
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-hover">
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Product</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Authorization</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Type</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">In PSMF</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">RMP</th>
                  <th className="text-left p-3 text-sm font-medium text-text-secondary">Next PSUR</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b border-border hover:bg-surface-hover">
                    <td className="p-3">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{product.productName}</p>
                        <p className="text-xs text-text-muted">{product.activeSubstance}</p>
                      </div>
                    </td>
                    <td className="p-3 text-sm font-mono text-text-secondary">{product.maaNumber}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-surface-hover text-text-secondary">
                        {product.authorizationType}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge color={statusColorMap[product.marketingStatus] || 'gray'} size="sm">
                        {product.marketingStatus}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {product.includedInPSMF ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                    <td className="p-3">
                      {product.rmpRequired ? (
                        <span className="text-sm text-text-secondary">v{product.rmpVersion}</span>
                      ) : (
                        <span className="text-sm text-text-muted">N/A</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-text-secondary">
                      {product.psurDueDate ? new Date(product.psurDueDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

export default PSMFScreen;
