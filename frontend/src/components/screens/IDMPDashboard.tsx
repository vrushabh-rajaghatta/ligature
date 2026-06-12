
// ============================================================================
// IDMP Dashboard - ISO 11615/11616/11238 Compliant Data Management UI (v199)
// Comprehensive UI for managing IDMP entities, sync, FHIR export, SPL rendering
// ============================================================================


import React, { useState, useEffect } from 'react';
import {
  useIDMPStore,
  useIDMPMedicinalProducts,
  useIDMPSubstances,
  useIDMPOrganizations,
  useIDMPPackagedProducts,
  useIDMPDashboardStats,
  useIDMPProductsByStatus,
  useIDMPSyncStatus
} from '@/store/useIDMPStore';
import type { IDMPView } from '@/store/idmpTypes';
import { useToast } from '@/components/ui/Toast';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Database, RefreshCw } from 'lucide-react';

// ============================================================================
// DASHBOARD COMPONENT
// ============================================================================

export default function IDMPDashboard() {
  const activeView = useIDMPStore(state => state.activeView);
  const setActiveView = useIDMPStore(state => state.setActiveView);
  const loadMockData = useIDMPStore(state => state.loadMockData);
  const syncWithMasterData = useIDMPStore(state => state.syncWithMasterData);
  const medicinalProducts = useIDMPMedicinalProducts();
  const stats = useIDMPDashboardStats();
  const syncStatus = useIDMPSyncStatus();
  const toast = useToast();
  // v0.88.0: track API source for display
  const [apiSource, setApiSource] = React.useState<'api' | 'seed' | 'store' | null>(null);

  useEffect(() => {
    // v0.88.0: Try real API first, fall back to loadMockData
    const init = async () => {
      try {
        const res = await fetch('/api/idmp/products', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const products = json.data || [];
          setApiSource(json.source === 'supabase' ? 'api' : 'seed');
          if (products.length > 0) {
            // Hydrate store with API products so all views stay in sync
            const createMp = useIDMPStore.getState().createMedicinalProduct;
            const existingIds = new Set(Object.keys(useIDMPStore.getState().medicinalProducts));
            for (const p of products) {
              if (!existingIds.has(p.id)) {
                createMp(p);
              }
            }
            // If we hydrated from API, also seed substances/orgs from mock for full demo
            if (Object.keys(useIDMPStore.getState().substances).length === 0) {
              loadMockData();
            }
            return;
          }
        }
      } catch {
        // Fall through to mock data
      }
      setApiSource('store');
      if (medicinalProducts.length === 0) {
        loadMockData();
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const views: { id: IDMPView; label: string; icon: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'medicinal-products', label: 'Medicinal Products', icon: '💊' },
    { id: 'substances', label: 'Substances', icon: '🧬' },
    { id: 'organizations', label: 'Organizations', icon: '🏢' },
    { id: 'packages', label: 'Packages', icon: '📦' },
    { id: 'validation', label: 'Validation', icon: '✓' },
    { id: 'export', label: 'Export', icon: '📤' },
  ];

  return (
    <div className="h-full flex flex-col bg-surface text-text-primary overflow-hidden">
      <ScreenHeader
        title="IDMP Data Management"
        subtitle="ISO 11615/11616/11238 Compliant Medicinal Product Identification"
        icon={<Database className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              {syncStatus.lastSyncedAt ? `Last sync: ${new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}` : 'Not synced'}
              {apiSource === 'api' && <span className="ml-2 text-status-success">· Supabase</span>}
              {apiSource === 'seed' && <span className="ml-2 text-accent-blue">· API (seed)</span>}
            </span>
            <button
              onClick={syncWithMasterData}
              disabled={syncStatus.status === 'syncing'}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                syncStatus.status === 'syncing'
                  ? 'bg-surface-card text-text-muted cursor-not-allowed border border-border'
                  : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus.status === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus.status === 'syncing' ? 'Syncing...' : 'Sync Master Data'}
            </button>
          </div>
        }
      />

      <div className="bg-surface-elevated border-b border-border px-6 flex-shrink-0">
        <nav className="flex gap-1 overflow-x-auto">
          {views.map(view => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeView === view.id
                  ? 'border-teal-500 text-teal-400'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <span className="mr-2">{view.icon}</span>{view.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {activeView === 'dashboard' && <DashboardView stats={stats} />}
        {activeView === 'medicinal-products' && <MedicinalProductsView />}
        {activeView === 'substances' && <SubstancesView />}
        {activeView === 'organizations' && <OrganizationsView />}
        {activeView === 'packages' && <PackagesView />}
        {activeView === 'validation' && <ValidationView />}
        {activeView === 'export' && <ExportView />}
      </div>
    </div>
  );

}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

interface DashboardStats {
  totalProducts: number;
  totalSubstances: number;
  totalOrganizations: number;
  totalPackages: number;
  approvedProducts: number;
  inDevelopment: number;
  validationScore: number;
  totalErrors: number;
  totalWarnings: number;
  lastSyncedAt: string | null;
}

function DashboardView({ stats }: { stats: DashboardStats }) {
  const productsByStatus = useIDMPProductsByStatus();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Medicinal Products" value={stats.totalProducts} icon="💊" color="bg-blue-500" subtitle={`${stats.approvedProducts} approved, ${stats.inDevelopment} in development`} />
        <StatCard title="Substances" value={stats.totalSubstances} icon="🧬" color="bg-purple-500" subtitle="Active pharmaceutical ingredients" />
        <StatCard title="Organizations" value={stats.totalOrganizations} icon="🏢" color="bg-amber-500" subtitle="MAHs, manufacturers, sponsors" />
        <StatCard title="Validation Score" value={`${stats.validationScore}%`} icon="✓" color={stats.validationScore >= 80 ? 'bg-green-500' : 'bg-amber-500'} subtitle={`${stats.totalErrors} errors, ${stats.totalWarnings} warnings`} />
      </div>

      <div className="bg-surface-elevated rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Development Pipeline</h2>
        <div className="flex items-center gap-2">
          {[
            { label: 'Discovery', count: productsByStatus.discovery.length, color: 'bg-border' },
            { label: 'Preclinical', count: productsByStatus.preclinical.length, color: 'bg-status-neutral' },
            { label: 'Phase 1', count: productsByStatus.phase1.length, color: 'bg-blue-400' },
            { label: 'Phase 2', count: productsByStatus.phase2.length, color: 'bg-blue-500' },
            { label: 'Phase 3', count: productsByStatus.phase3.length, color: 'bg-blue-600' },
            { label: 'Filed', count: productsByStatus.filed.length, color: 'bg-amber-500' },
            { label: 'Approved', count: productsByStatus.approved.length, color: 'bg-green-500' },
            { label: 'Marketed', count: productsByStatus.marketed.length, color: 'bg-green-600' },
          ].map((stage) => (
            <div key={stage.label} className="flex-1 text-center">
              <div className={`${stage?.color ?? ''} text-white rounded-lg py-3 px-2 mb-2`}>
                <div className="text-2xl font-bold">{stage.count}</div>
              </div>
              <div className="text-xs text-text-muted">{stage.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 rounded-lg border border-teal-500/30 p-6">
        <h3 className="text-lg font-semibold text-teal-300 mb-3">IDMP Standards Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div><div className="font-medium text-teal-300">ISO 11615</div><div className="text-teal-400">Medicinal Product Identification</div></div>
          <div><div className="font-medium text-teal-300">ISO 11616</div><div className="text-teal-400">Organization Identification</div></div>
          <div><div className="font-medium text-teal-300">ISO 11238</div><div className="text-teal-400">Substance Identification</div></div>
        </div>
        <div className="mt-4 pt-4 border-t border-teal-500/30 flex items-center gap-2 text-sm text-teal-400">
          <span className="text-green-500">✓</span>Accumulus Synergy Ready
          <span className="mx-2">•</span><span className="text-green-500">✓</span>FHIR R5 Compatible
          <span className="mx-2">•</span><span className="text-green-500">✓</span>FDA SPL Export
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, subtitle }: { title: string; value: string | number; icon: string; color: string; subtitle: string }) {
  return (
    <div className="bg-surface-elevated rounded-xl border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">{title}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          <p className="text-xs text-text-muted mt-1">{subtitle}</p>
        </div>
        <div className={`${color} text-white p-2 rounded-lg text-xl`}>{icon}</div>
      </div>
    </div>
  );
}

// ============================================================================
// MEDICINAL PRODUCTS VIEW
// ============================================================================

function MedicinalProductsView() {
  const products = useIDMPMedicinalProducts();
  const selectedId = useIDMPStore(state => state.selectedMedicinalProductId);
  const setSelected = useIDMPStore(state => state.setSelectedMedicinalProduct);
  const validateEntity = useIDMPStore(state => state.validateEntity);
  const exportToFHIR = useIDMPStore(state => state.exportToFHIR);
  const exportToSPL = useIDMPStore(state => state.exportToSPL);
  const validationResults = useIDMPStore(state => state.validationResults);
  const toast = useToast();

  const selectedProduct = products.find(p => p.id === selectedId);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'discovery': 'bg-surface-card text-text-muted', 'preclinical': 'bg-surface-hover text-text-secondary',
      'phase-1': 'bg-blue-500/20 text-blue-400', 'phase-2': 'bg-blue-200 text-blue-700', 'phase-3': 'bg-blue-300 text-blue-400',
      'filed': 'bg-amber-500/20 text-amber-400', 'approved': 'bg-green-500/20 text-green-400', 'marketed': 'bg-green-500/30 text-green-300',
    };
    return colors[status] || 'bg-surface-card text-text-secondary';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-surface-elevated rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">Medicinal Products</h2>
          <p className="text-sm text-text-muted">{products.length} products</p>
        </div>
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {products.map(product => (
            <button key={product.id} onClick={() => setSelected(product.id)} className={`w-full p-4 text-left hover:bg-surface-card ${selectedId === product.id ? 'bg-teal-500/10 border-l-2 border-teal-500' : ''}`}>
              <div className="font-medium text-text-primary">{product.inventedName}</div>
              <div className="text-sm text-text-muted mt-0.5">{product.scientificName}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(product.developmentStatus)}`}>{product.developmentStatus.replace(/-/g, ' ')}</span>
                <span className="text-xs text-text-muted">{product.mpId}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedProduct ? (
          <div className="bg-surface-elevated rounded-xl border border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-text-primary">{selectedProduct.fullName}</h2>
                <p className="text-sm text-text-muted">{selectedProduct.mpId}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => validateEntity(selectedProduct.id, 'medicinal-product')} className="px-3 py-1.5 text-sm bg-surface-card text-text-secondary rounded-lg hover:bg-surface-card">Validate</button>
                <button onClick={() => { 
                  const fhirData = exportToFHIR(selectedProduct.id);
                  const blob = new Blob([JSON.stringify(fhirData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedProduct.mpId}-fhir.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('FHIR Bundle exported');
                }} className="px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-200">Export FHIR</button>
                <button onClick={() => { 
                  const splData = exportToSPL(selectedProduct.id);
                  const blob = new Blob([splData], { type: 'application/xml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedProduct.mpId}-spl.xml`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('SPL XML exported');
                }} className="px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-200">Export SPL</button>
              </div>
            </div>

            {validationResults[selectedProduct.id] && (
              <div className={`px-4 py-2 text-sm ${validationResults[selectedProduct.id].isValid ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {validationResults[selectedProduct.id].isValid ? '✓ Valid' : `✗ ${validationResults[selectedProduct.id].errors.length} errors`}
              </div>
            )}

            <div className="p-4 space-y-4 md:space-y-6">
              <section>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Product Identity</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <InfoRow label="Full Name" value={selectedProduct.fullName} />
                  <InfoRow label="Invented Name" value={selectedProduct.inventedName} />
                  <InfoRow label="Scientific Name" value={selectedProduct.scientificName || '—'} />
                  <InfoRow label="MPID" value={selectedProduct.mpId} />
                  <InfoRow label="Dose Form" value={selectedProduct.combinedPharmaceuticalDoseForm} />
                  <InfoRow label="Legal Status" value={selectedProduct.legalStatusOfSupply.replace(/-/g, ' ')} />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Designations</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.orphanDrugDesignation && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">Orphan Drug</span>}
                  {selectedProduct.pediatricUseIndicator && <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Pediatric Use</span>}
                  {selectedProduct.additionalMonitoringIndicator && <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">Additional Monitoring</span>}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Marketing Authorization Holder</h3>
                <div className="bg-surface-card rounded-lg p-3">
                  <div className="font-medium text-text-primary">{selectedProduct.marketingAuthorizationHolder.name}</div>
                  <div className="text-sm text-text-muted">{selectedProduct.marketingAuthorizationHolder.address.city}, {selectedProduct.marketingAuthorizationHolder.address.countryName}</div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Authorizations</h3>
                {selectedProduct.authorizations.length > 0 ? selectedProduct.authorizations.map(auth => (
                  <div key={auth.id} className="bg-surface-card rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary">{auth.maNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${auth.authorizationStatus === 'valid' ? 'bg-green-500/20 text-green-400' : 'bg-surface-card'}`}>{auth.authorizationStatus}</span>
                    </div>
                    <div className="text-sm text-text-muted">{auth.regulatoryAuthority} • {auth.jurisdiction}</div>
                  </div>
                )) : <p className="text-sm text-text-muted">No authorizations</p>}
              </section>

              <section>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Therapeutic Indications</h3>
                {selectedProduct.therapeuticIndications.map(ind => (
                  <div key={ind.id} className="bg-surface-card rounded-lg p-3 mb-2">
                    <div className="text-sm text-text-primary">{ind.indication}</div>
                    <span className={`text-xs px-2 py-0.5 rounded mt-2 inline-block ${ind.approvalStatus === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{ind.approvalStatus}</span>
                  </div>
                ))}
              </section>
            </div>
          </div>
        ) : (
          <div className="bg-surface-elevated rounded-xl border border-border p-8 text-center">
            <div className="text-4xl mb-3">💊</div>
            <div className="text-text-muted">Select a medicinal product to view details</div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div><div className="text-text-muted text-xs">{label}</div><div className="text-text-primary">{value}</div></div>;
}

// ============================================================================
// SUBSTANCES VIEW
// ============================================================================

function SubstancesView() {
  const substances = useIDMPSubstances();
  const selectedId = useIDMPStore(state => state.selectedSubstanceId);
  const setSelected = useIDMPStore(state => state.setSelectedSubstance);
  const selectedSubstance = substances.find(s => s.id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-surface-elevated rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">Substances</h2>
          <p className="text-sm text-text-muted">{substances.length} substances</p>
        </div>
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {substances.map(substance => (
            <button key={substance.id} onClick={() => setSelected(substance.id)} className={`w-full p-4 text-left hover:bg-surface-card ${selectedId === substance.id ? 'bg-teal-500/10 border-l-2 border-teal-500' : ''}`}>
              <div className="font-medium text-text-primary">{substance.preferredName}</div>
              <div className="text-sm text-text-muted">{substance.substanceType} • {substance.substanceClass.join(', ')}</div>
              <div className="text-xs text-text-muted mt-1">{substance.substanceId}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedSubstance ? (
          <div className="bg-surface-elevated rounded-xl border border-border p-4 space-y-4 md:space-y-6">
            <div>
              <h2 className="font-semibold text-text-primary text-lg">{selectedSubstance.preferredName}</h2>
              <p className="text-sm text-text-muted">{selectedSubstance.substanceId}</p>
            </div>
            <section>
              <h3 className="text-sm font-medium text-text-secondary mb-3">Identifiers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <InfoRow label="INN" value={selectedSubstance.innName || '—'} />
                <InfoRow label="USAN" value={selectedSubstance.usan || '—'} />
                <InfoRow label="CAS Number" value={selectedSubstance.casNumber || '—'} />
                <InfoRow label="UNII" value={selectedSubstance.unii || '—'} />
              </div>
            </section>
            {(selectedSubstance.molecularFormula || selectedSubstance.molecularWeight) && (
              <section>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Structure</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <InfoRow label="Molecular Formula" value={selectedSubstance.molecularFormula || '—'} />
                  <InfoRow label="Molecular Weight" value={selectedSubstance.molecularWeight ? `${selectedSubstance.molecularWeight} g/mol` : '—'} />
                </div>
              </section>
            )}
            <section>
              <h3 className="text-sm font-medium text-text-secondary mb-3">Classification</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">{selectedSubstance.substanceType}</span>
                {selectedSubstance.substanceClass.map(cls => <span key={cls} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">{cls}</span>)}
              </div>
            </section>
          </div>
        ) : (
          <div className="bg-surface-elevated rounded-xl border border-border p-8 text-center">
            <div className="text-4xl mb-3">🧬</div>
            <div className="text-text-muted">Select a substance to view details</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ORGANIZATIONS VIEW
// ============================================================================

function OrganizationsView() {
  const organizations = useIDMPOrganizations();
  const selectedId = useIDMPStore(state => state.selectedOrganizationId);
  const setSelected = useIDMPStore(state => state.setSelectedOrganization);
  const selectedOrg = organizations.find(o => o.id === selectedId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-surface-elevated rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">Organizations</h2>
          <p className="text-sm text-text-muted">{organizations.length} organizations</p>
        </div>
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          {organizations.map(org => (
            <button key={org.id} onClick={() => setSelected(org.id)} className={`w-full p-4 text-left hover:bg-surface-card ${selectedId === org.id ? 'bg-teal-500/10 border-l-2 border-teal-500' : ''}`}>
              <div className="font-medium text-text-primary">{org.name}</div>
              <div className="text-sm text-text-muted">{org.organizationType.replace(/-/g, ' ')}</div>
              <div className="text-xs text-text-muted mt-1">{org.address.city}, {org.address.countryName}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedOrg ? (
          <div className="bg-surface-elevated rounded-xl border border-border p-4 space-y-4 md:space-y-6">
            <div>
              <h2 className="font-semibold text-text-primary text-lg">{selectedOrg.name}</h2>
              <p className="text-sm text-text-muted">{selectedOrg.legalName}</p>
            </div>
            <section>
              <h3 className="text-sm font-medium text-text-secondary mb-3">Identifiers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <InfoRow label="Organization ID" value={selectedOrg.orgId} />
                <InfoRow label="DUNS Number" value={selectedOrg.dunsNumber || '—'} />
                <InfoRow label="FEI Number" value={selectedOrg.feiNumber || '—'} />
              </div>
            </section>
            <section>
              <h3 className="text-sm font-medium text-text-secondary mb-3">Address</h3>
              <div className="bg-surface-card rounded-lg p-3 text-sm">
                {selectedOrg.address.streetAddress.map((line, i) => <div key={i}>{line}</div>)}
                <div>{selectedOrg.address.city}{selectedOrg.address.stateProvince ? `, ${selectedOrg.address.stateProvince}` : ''} {selectedOrg.address.postalCode}</div>
                <div>{selectedOrg.address.countryName}</div>
              </div>
            </section>
            <section>
              <h3 className="text-sm font-medium text-text-secondary mb-3">Roles</h3>
              <div className="flex flex-wrap gap-2">
                {selectedOrg.roles.map(role => <span key={role} className="px-2 py-1 bg-teal-100 text-teal-400 rounded text-xs">{role.replace(/-/g, ' ')}</span>)}
              </div>
            </section>
          </div>
        ) : (
          <div className="bg-surface-elevated rounded-xl border border-border p-8 text-center">
            <div className="text-4xl mb-3">🏢</div>
            <div className="text-text-muted">Select an organization to view details</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PACKAGES VIEW
// ============================================================================

function PackagesView() {
  const packages = useIDMPPackagedProducts();

  return (
    <div className="bg-surface-elevated rounded-xl border border-border">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-text-primary">Packaged Medicinal Products</h2>
        <p className="text-sm text-text-muted">{packages.length} packages</p>
      </div>
      <div className="p-4">
        {packages.length > 0 ? packages.map(pkg => (
          <div key={pkg.id} className="bg-surface-card rounded-lg p-4 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">{pkg.packageDescription}</div>
                <div className="text-sm text-text-muted">{pkg.pcId}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${pkg.marketingStatus === 'marketed' ? 'bg-green-500/20 text-green-400' : 'bg-surface-card'}`}>{pkg.marketingStatus.replace(/-/g, ' ')}</span>
            </div>
          </div>
        )) : <div className="text-center py-8 text-text-muted">No packages defined</div>}
      </div>
    </div>
  );
}

// ============================================================================
// VALIDATION VIEW
// ============================================================================

function ValidationView() {
  const validateAll = useIDMPStore(state => state.validateAll);
  const validationResults = useIDMPStore(state => state.validationResults);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidateAll = () => {
    setIsValidating(true);
    validateAll();
    setTimeout(() => setIsValidating(false), 500);
  };

  const results = Object.values(validationResults);
  const validCount = results.filter(r => r.isValid).length;
  const errorCount = results.reduce((acc, r) => acc + r.errors.length, 0);
  const warningCount = results.reduce((acc, r) => acc + r.warnings.length, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-surface-elevated rounded-xl border border-border p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-text-primary">IDMP Validation</h2>
          <p className="text-sm text-text-muted">Validate all entities against IDMP standards</p>
        </div>
        <button onClick={handleValidateAll} disabled={isValidating} className={`px-4 py-2 rounded-lg text-white font-medium ${isValidating ? 'bg-status-neutral cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}>
          {isValidating ? 'Validating...' : 'Validate All'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-elevated rounded-xl border border-border p-4">
          <div className="text-sm text-text-muted">Valid Entities</div>
          <div className="text-2xl font-bold text-green-600">{validCount}/{results.length}</div>
        </div>
        <div className="bg-surface-elevated rounded-xl border border-border p-4">
          <div className="text-sm text-text-muted">Total Errors</div>
          <div className="text-2xl font-bold text-red-600">{errorCount}</div>
        </div>
        <div className="bg-surface-elevated rounded-xl border border-border p-4">
          <div className="text-sm text-text-muted">Total Warnings</div>
          <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-xl border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">Validation Results</h3>
        </div>
        <div className="divide-y divide-border">
          {results.length > 0 ? results.map(result => (
            <div key={result.entityId} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">{result.entityType.replace(/-/g, ' ')}</span>
                <span className={`px-2 py-1 rounded text-xs ${result.isValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{result.isValid ? 'Valid' : 'Invalid'}</span>
              </div>
              {result.errors.map((err, i) => <div key={i} className="text-sm text-red-600 mt-1">✗ {err.field}: {err.message}</div>)}
              {result.warnings.map((warn, i) => <div key={i} className="text-sm text-amber-600 mt-1">⚠ {warn.field}: {warn.message}</div>)}
            </div>
          )) : <div className="p-8 text-center text-text-muted">Click &quot;Validate All&quot; to check your IDMP data</div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT VIEW
// ============================================================================

function ExportView() {
  const products = useIDMPMedicinalProducts();
  const exportToFHIR = useIDMPStore(state => state.exportToFHIR);
  const exportToSPL = useIDMPStore(state => state.exportToSPL);

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'fhir' | 'spl'>('fhir');
  const [exportResult, setExportResult] = useState<string>('');

  const handleExport = () => {
    if (!selectedProductId) return;
    if (exportFormat === 'fhir') {
      setExportResult(JSON.stringify(exportToFHIR(selectedProductId), null, 2));
    } else {
      setExportResult(exportToSPL(selectedProductId));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6">
    <div className="space-y-4 md:space-y-6">
      <div className="bg-surface-elevated rounded-xl border border-border p-6">
        <h2 className="font-semibold text-text-primary mb-4">Export IDMP Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Medicinal Product</label>
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="w-full p-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-teal-500">
              <option value="">Select a product...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.inventedName} ({p.mpId})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Export Format</label>
            <div className="flex gap-4">
              <label className="flex items-center"><input type="radio" name="format" value="fhir" checked={exportFormat === 'fhir'} onChange={() => setExportFormat('fhir')} className="mr-2" /><span>FHIR R5 (JSON)</span></label>
              <label className="flex items-center"><input type="radio" name="format" value="spl" checked={exportFormat === 'spl'} onChange={() => setExportFormat('spl')} className="mr-2" /><span>SPL (XML)</span></label>
            </div>
          </div>
        </div>
        <button onClick={handleExport} disabled={!selectedProductId} className={`px-4 py-2 rounded-lg text-white font-medium ${!selectedProductId ? 'bg-status-neutral cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700'}`}>Generate Export</button>
      </div>

      {exportResult && (
        <div className="bg-surface-elevated rounded-xl border border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">{exportFormat === 'fhir' ? 'FHIR MedicinalProductDefinition' : 'SPL Document'}</h3>
            <button onClick={() => navigator.clipboard.writeText(exportResult)} className="px-3 py-1.5 text-sm bg-surface-card text-text-secondary rounded hover:bg-surface-card">Copy</button>
          </div>
          <pre className="p-4 text-xs overflow-auto max-h-[500px] bg-surface-card">{exportResult}</pre>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-500/10 rounded-xl border border-blue-500/30 p-4">
          <div className="text-blue-400 font-medium">FHIR R5 Resources</div>
          <div className="text-sm text-blue-400 mt-1">MedicinalProductDefinition, SubstanceDefinition, Organization</div>
        </div>
        <div className="bg-purple-500/10 rounded-xl border border-purple-500/30 p-4">
          <div className="text-purple-400 font-medium">FDA SPL XML</div>
          <div className="text-sm text-purple-400 mt-1">Structured Product Labeling for DailyMed</div>
        </div>
        <div className="bg-teal-50 rounded-lg border border-teal-500/30 p-4">
          <div className="text-teal-300 font-medium">Accumulus Ready</div>
          <div className="text-sm text-teal-400 mt-1">API-first continuous submission format</div>
        </div>
      </div>
    </div>
    </div>
  );
}
