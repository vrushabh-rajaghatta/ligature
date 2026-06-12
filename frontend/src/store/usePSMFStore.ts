

// ============================================================================
// PSMF Store - v0.13.64: Pharmacovigilance System Master File
// ============================================================================
// Zustand store for EU GVP Module II compliant PSMF management
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  PSMFState,
  PSMFActions,
  PSMFView,
  PSMFFilters,
  QPPV,
  OrganizationalUnit,
  ComputerizedSystem,
  SystemInterface,
  PVProcess,
  SOP,
  PVAudit,
  AuditFinding,
  ServiceProvider,
  AuthorizedProduct,
  PSMFDocument,
  PSMFSection,
  PSMFSectionContent,
  PSMFComplianceMetrics,
  SOPCategory,
  SOPStatus,
  SystemCategory,
  SystemStatus,
  AuditStatus,
  FindingStatus,
  FindingSeverity,
  ServiceProviderType,
} from './psmfTypes';

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialFilters: PSMFFilters = {
  searchQuery: '',
  sopStatus: 'all',
  sopCategory: 'all',
  systemStatus: 'all',
  systemCategory: 'all',
  auditStatus: 'all',
  findingStatus: 'all',
  findingSeverity: 'all',
  providerType: 'all',
};

const initialState: PSMFState = {
  qppvs: {},
  selectedQppvId: null,
  organizationalUnits: {},
  selectedOrgUnitId: null,
  computerizedSystems: {},
  systemInterfaces: {},
  selectedSystemId: null,
  pvProcesses: {},
  sops: {},
  selectedProcessId: null,
  selectedSopId: null,
  audits: {},
  selectedAuditId: null,
  serviceProviders: {},
  selectedProviderId: null,
  authorizedProducts: {},
  selectedProductId: null,
  psmfDocuments: {},
  activePsmfId: null,
  complianceMetrics: null,
  view: 'dashboard',
  filters: initialFilters,
  isLoading: false,
  error: null,
};

// ============================================================================
// HELPERS
// ============================================================================

const generateId = (prefix: string) => 
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const now = () => new Date().toISOString();

// ============================================================================
// STORE
// ============================================================================

export const usePSMFStore = create<PSMFState & PSMFActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ======================================================================
      // QPPV MANAGEMENT
      // ======================================================================
      
      createQPPV: (qppvData) => {
        const id = generateId('qppv');
        const timestamp = now();
        const qppv: QPPV = {
          ...qppvData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          qppvs: { ...state.qppvs, [id]: qppv },
        }));
        
        return qppv;
      },
      
      updateQPPV: (id, updates) => {
        set((state) => {
          const existing = state.qppvs[id];
          if (!existing) return state;
          
          return {
            qppvs: {
              ...state.qppvs,
              [id]: { ...existing, ...updates, updatedAt: now() },
            },
          };
        });
      },
      
      deleteQPPV: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.qppvs;
          return {
            qppvs: rest,
            selectedQppvId: state.selectedQppvId === id ? null : state.selectedQppvId,
          };
        });
      },
      
      selectQPPV: (id) => {
        set({ selectedQppvId: id });
      },

      // ======================================================================
      // ORGANIZATIONAL UNITS
      // ======================================================================
      
      createOrgUnit: (unitData) => {
        const id = generateId('org');
        const timestamp = now();
        const unit: OrganizationalUnit = {
          ...unitData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          organizationalUnits: { ...state.organizationalUnits, [id]: unit },
        }));
        
        return unit;
      },
      
      updateOrgUnit: (id, updates) => {
        set((state) => {
          const existing = state.organizationalUnits[id];
          if (!existing) return state;
          
          return {
            organizationalUnits: {
              ...state.organizationalUnits,
              [id]: { ...existing, ...updates, updatedAt: now() },
            },
          };
        });
      },
      
      deleteOrgUnit: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.organizationalUnits;
          return {
            organizationalUnits: rest,
            selectedOrgUnitId: state.selectedOrgUnitId === id ? null : state.selectedOrgUnitId,
          };
        });
      },
      
      selectOrgUnit: (id) => {
        set({ selectedOrgUnitId: id });
      },

      // ======================================================================
      // COMPUTERIZED SYSTEMS
      // ======================================================================
      
      createSystem: (systemData) => {
        const id = generateId('sys');
        const timestamp = now();
        const system: ComputerizedSystem = {
          ...systemData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          computerizedSystems: { ...state.computerizedSystems, [id]: system },
        }));
        
        return system;
      },
      
      updateSystem: (id, updates) => {
        set((state) => {
          const existing = state.computerizedSystems[id];
          if (!existing) return state;
          
          return {
            computerizedSystems: {
              ...state.computerizedSystems,
              [id]: { ...existing, ...updates, updatedAt: now() },
            },
          };
        });
      },
      
      deleteSystem: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.computerizedSystems;
          return {
            computerizedSystems: rest,
            selectedSystemId: state.selectedSystemId === id ? null : state.selectedSystemId,
          };
        });
      },
      
      selectSystem: (id) => {
        set({ selectedSystemId: id });
      },
      
      createInterface: (ifaceData) => {
        const id = generateId('iface');
        const timestamp = now();
        const iface: SystemInterface = {
          ...ifaceData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          systemInterfaces: { ...state.systemInterfaces, [id]: iface },
        }));
        
        return iface;
      },

      // ======================================================================
      // PROCESSES & SOPs
      // ======================================================================
      
      createProcess: (processData) => {
        const id = generateId('proc');
        const timestamp = now();
        const process: PVProcess = {
          ...processData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          pvProcesses: { ...state.pvProcesses, [id]: process },
        }));
        
        return process;
      },
      
      updateProcess: (id, updates) => {
        set((state) => {
          const existing = state.pvProcesses[id];
          if (!existing) return state;
          
          return {
            pvProcesses: {
              ...state.pvProcesses,
              [id]: { ...existing, ...updates, updatedAt: now() },
            },
          };
        });
      },
      
      deleteProcess: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.pvProcesses;
          return {
            pvProcesses: rest,
            selectedProcessId: state.selectedProcessId === id ? null : state.selectedProcessId,
          };
        });
      },
      
      selectProcess: (id) => {
        set({ selectedProcessId: id });
      },
      
      createSOP: (sopData) => {
        const id = generateId('sop');
        const timestamp = now();
        const sop: SOP = {
          ...sopData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          sops: { ...state.sops, [id]: sop },
        }));
        
        return sop;
      },
      
      updateSOP: (id, updates) => {
        set((state) => {
          const existing = state.sops[id];
          if (!existing) return state;
          
          return {
            sops: {
              ...state.sops,
              [id]: { ...existing, ...updates, updatedAt: now() },
            },
          };
        });
      },
      
      deleteSOP: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.sops;
          return {
            sops: rest,
            selectedSopId: state.selectedSopId === id ? null : state.selectedSopId,
          };
        });
      },
      
      selectSOP: (id) => {
        set({ selectedSopId: id });
      },

      // ======================================================================
      // AUDITS
      // ======================================================================
      
      createAudit: (auditData) => {
        const id = generateId('audit');
        const timestamp = now();
        const audit: PVAudit = {
          ...auditData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          audits: { ...state.audits, [id]: audit },
        }));
        
        return audit;
      },
      
      updateAudit: (id, updates) => {
        set((state) => {
          const existing = state.audits[id];
          if (!existing) return state;
          
          return {
            audits: {
              ...state.audits,
              [id]: { ...existing, ...updates, updatedAt: now() },
            },
          };
        });
      },
      
      deleteAudit: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.audits;
          return {
            audits: rest,
            selectedAuditId: state.selectedAuditId === id ? null : state.selectedAuditId,
          };
        });
      },
      
      selectAudit: (id) => {
        set({ selectedAuditId: id });
      },
      
      addFinding: (auditId, findingData) => {
        const id = generateId('finding');
        const timestamp = now();
        const finding: AuditFinding = {
          ...findingData,
          id,
          auditId,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => {
          const audit = state.audits[auditId];
          if (!audit) return state;
          
          return {
            audits: {
              ...state.audits,
              [auditId]: {
                ...audit,
                findings: [...audit.findings, finding],
                updatedAt: timestamp,
              },
            },
          };
        });
        
        return finding;
      },
      
      updateFinding: (auditId, findingId, updates) => {
        set((state) => {
          const audit = state.audits[auditId];
          if (!audit) return state;
          
          const findingIndex = audit.findings.findIndex(f => f.id === findingId);
          if (findingIndex === -1) return state;
          
          const updatedFindings = [...audit.findings];
          updatedFindings[findingIndex] = {
            ...updatedFindings[findingIndex],
            ...updates,
            updatedAt: now(),
          };
          
          return {
            audits: {
              ...state.audits,
              [auditId]: {
                ...audit,
                findings: updatedFindings,
                updatedAt: now(),
              },
            },
          };
        });
      },
      
      closeFinding: (auditId, findingId, verificationNotes) => {
        const timestamp = now();
        set((state) => {
          const audit = state.audits[auditId];
          if (!audit) return state;
          
          const findingIndex = audit.findings.findIndex(f => f.id === findingId);
          if (findingIndex === -1) return state;
          
          const updatedFindings = [...audit.findings];
          updatedFindings[findingIndex] = {
            ...updatedFindings[findingIndex],
            status: 'closed',
            actualClosureDate: timestamp,
            verificationDate: timestamp,
            updatedAt: timestamp,
          };
          
          return {
            audits: {
              ...state.audits,
              [auditId]: {
                ...audit,
                findings: updatedFindings,
                updatedAt: timestamp,
              },
            },
          };
        });
      },

      // ======================================================================
      // SERVICE PROVIDERS
      // ======================================================================
      
      createProvider: (providerData) => {
        const id = generateId('provider');
        const timestamp = now();
        const provider: ServiceProvider = {
          ...providerData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          serviceProviders: { ...state.serviceProviders, [id]: provider },
        }));
        
        return provider;
      },
      
      updateProvider: (id, updates) => {
        set((state) => {
          const existing = state.serviceProviders[id];
          if (!existing) return state;
          
          return {
            serviceProviders: {
              ...state.serviceProviders,
              [id]: { ...existing, ...updates, updatedAt: now() },
            },
          };
        });
      },
      
      deleteProvider: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.serviceProviders;
          return {
            serviceProviders: rest,
            selectedProviderId: state.selectedProviderId === id ? null : state.selectedProviderId,
          };
        });
      },
      
      selectProvider: (id) => {
        set({ selectedProviderId: id });
      },

      // ======================================================================
      // AUTHORIZED PRODUCTS
      // ======================================================================
      
      linkProduct: (productData) => {
        const id = generateId('auth-prod');
        const timestamp = now();
        const product: AuthorizedProduct = {
          ...productData,
          id,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          authorizedProducts: { ...state.authorizedProducts, [id]: product },
        }));
        
        return product;
      },
      
      updateProduct: (id, updates) => {
        set((state) => {
          const existing = state.authorizedProducts[id];
          if (!existing) return state;
          
          return {
            authorizedProducts: {
              ...state.authorizedProducts,
              [id]: { ...existing, ...updates, updatedAt: now() },
            },
          };
        });
      },
      
      unlinkProduct: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.authorizedProducts;
          return {
            authorizedProducts: rest,
            selectedProductId: state.selectedProductId === id ? null : state.selectedProductId,
          };
        });
      },
      
      selectProduct: (id) => {
        set({ selectedProductId: id });
      },

      // ======================================================================
      // PSMF DOCUMENT
      // ======================================================================
      
      createPSMFDocument: (version, authorId, authorName) => {
        const id = generateId('psmf');
        const timestamp = now();
        
        // Initialize all sections
        const sections: PSMFSectionContent[] = [
          { section: 'cover-page', title: 'Cover Page', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'qppv-details', title: 'QPPV and Contact Details', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'organizational-structure', title: 'Organizational Structure', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'sources-of-data', title: 'Sources of Safety Data', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'computerized-systems', title: 'Computerized Systems and Databases', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'processes', title: 'Pharmacovigilance Processes', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'performance-indicators', title: 'Performance Indicators', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'quality-system', title: 'Quality System', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'audits-inspections', title: 'Audits and Inspections', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'contractual-arrangements', title: 'Contractual Arrangements', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'authorized-products', title: 'Authorized Medicinal Products', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
          { section: 'annexes', title: 'Annexes', lastUpdated: timestamp, updatedBy: authorName, status: 'needs-update', documentIds: [], notes: null },
        ];
        
        const psmf: PSMFDocument = {
          id,
          version,
          status: 'draft',
          sections,
          createdDate: timestamp,
          lastModifiedDate: timestamp,
          effectiveDate: null,
          expirationDate: null,
          authorId,
          authorName,
          approverId: null,
          approverName: null,
          approvalDate: null,
          qppvSignoffDate: null,
          lastInspectionDate: null,
          inspectionFindings: [],
          lastReviewDate: null,
          nextReviewDate: null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        
        set((state) => ({
          psmfDocuments: { ...state.psmfDocuments, [id]: psmf },
          activePsmfId: id,
        }));
        
        return psmf;
      },
      
      updatePSMFSection: (psmfId, section, updates) => {
        set((state) => {
          const psmf = state.psmfDocuments[psmfId];
          if (!psmf) return state;
          
          const sectionIndex = psmf.sections.findIndex(s => s.section === section);
          if (sectionIndex === -1) return state;
          
          const updatedSections = [...psmf.sections];
          updatedSections[sectionIndex] = {
            ...updatedSections[sectionIndex],
            ...updates,
            lastUpdated: now(),
          };
          
          return {
            psmfDocuments: {
              ...state.psmfDocuments,
              [psmfId]: {
                ...psmf,
                sections: updatedSections,
                lastModifiedDate: now(),
                updatedAt: now(),
              },
            },
          };
        });
      },
      
      approvePSMF: (psmfId, approverId, approverName) => {
        const timestamp = now();
        set((state) => {
          const psmf = state.psmfDocuments[psmfId];
          if (!psmf) return state;
          
          return {
            psmfDocuments: {
              ...state.psmfDocuments,
              [psmfId]: {
                ...psmf,
                status: 'approved',
                approverId,
                approverName,
                approvalDate: timestamp,
                updatedAt: timestamp,
              },
            },
          };
        });
      },
      
      qppvSignoff: (psmfId) => {
        const timestamp = now();
        set((state) => {
          const psmf = state.psmfDocuments[psmfId];
          if (!psmf) return state;
          
          return {
            psmfDocuments: {
              ...state.psmfDocuments,
              [psmfId]: {
                ...psmf,
                status: 'effective',
                qppvSignoffDate: timestamp,
                effectiveDate: timestamp,
                updatedAt: timestamp,
              },
            },
          };
        });
      },
      
      archivePSMF: (psmfId) => {
        set((state) => {
          const psmf = state.psmfDocuments[psmfId];
          if (!psmf) return state;
          
          return {
            psmfDocuments: {
              ...state.psmfDocuments,
              [psmfId]: {
                ...psmf,
                status: 'archived',
                updatedAt: now(),
              },
            },
            activePsmfId: state.activePsmfId === psmfId ? null : state.activePsmfId,
          };
        });
      },

      // ======================================================================
      // COMPLIANCE METRICS
      // ======================================================================
      
      calculateComplianceMetrics: () => {
        const state = get();
        const timestamp = now();
        
        // QPPV metrics
        const qppvList = Object.values(state.qppvs);
        const primaryQppv = qppvList.find(q => q.type === 'primary' && q.status === 'active');
        const deputyQppv = qppvList.find(q => q.type === 'deputy' && q.status === 'active');
        const qppvInPlace = !!primaryQppv;
        const qppvTrainingCurrent = primaryQppv?.lastTrainingDate 
          ? new Date(primaryQppv.lastTrainingDate) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
          : false;
        const deputyQPPVAvailable = !!deputyQppv;
        
        // Systems metrics
        const systems = Object.values(state.computerizedSystems);
        const totalSystems = systems.length;
        const validatedSystems = systems.filter(s => s.validationStatus === 'validated').length;
        const systemsRequiringRevalidation = systems.filter(s => 
          s.validationStatus === 'revalidation-required' ||
          (s.nextRevalidationDate && new Date(s.nextRevalidationDate) < new Date())
        ).length;
        
        // SOPs metrics
        const sops = Object.values(state.sops);
        const totalSOPs = sops.length;
        const effectiveSOPs = sops.filter(s => s.status === 'effective').length;
        const today = new Date();
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const sopsRequiringReview = sops.filter(s => 
          s.nextReviewDate && new Date(s.nextReviewDate) <= thirtyDaysFromNow
        ).length;
        const overdueSOPs = sops.filter(s => 
          s.nextReviewDate && new Date(s.nextReviewDate) < today
        ).length;
        
        // Audits metrics
        const audits = Object.values(state.audits);
        const totalAudits = audits.length;
        const completedAudits = audits.filter(a => a.status === 'completed').length;
        
        const allFindings = audits.flatMap(a => a.findings);
        const openFindings = allFindings.filter(f => f.status === 'open' || f.status === 'in-progress').length;
        const criticalFindings = allFindings.filter(f => f.severity === 'critical' && f.status !== 'closed').length;
        const overdueFindings = allFindings.filter(f => 
          f.targetClosureDate && 
          new Date(f.targetClosureDate) < today && 
          f.status !== 'closed'
        ).length;
        
        // Service providers metrics
        const providers = Object.values(state.serviceProviders);
        const totalProviders = providers.length;
        const qualifiedProviders = providers.filter(p => p.qualificationStatus === 'qualified').length;
        const providersRequiringRequalification = providers.filter(p => 
          p.qualificationStatus === 'requires-requalification'
        ).length;
        const activeSdeas = providers.filter(p => p.sdeaRequired && p.sdeaReference).length;
        
        // Products metrics
        const products = Object.values(state.authorizedProducts);
        const totalProducts = products.length;
        const productsCovered = products.filter(p => p.includedInPSMF).length;
        
        // Calculate overall score (weighted)
        let score = 0;
        let maxScore = 0;
        
        // QPPV (25 points)
        maxScore += 25;
        if (qppvInPlace) score += 15;
        if (qppvTrainingCurrent) score += 5;
        if (deputyQPPVAvailable) score += 5;
        
        // Systems (20 points)
        maxScore += 20;
        if (totalSystems > 0) {
          score += (validatedSystems / totalSystems) * 15;
          score += systemsRequiringRevalidation === 0 ? 5 : 0;
        }
        
        // SOPs (20 points)
        maxScore += 20;
        if (totalSOPs > 0) {
          score += (effectiveSOPs / totalSOPs) * 15;
          score += overdueSOPs === 0 ? 5 : 0;
        }
        
        // Audits (20 points)
        maxScore += 20;
        score += criticalFindings === 0 ? 10 : 0;
        score += overdueFindings === 0 ? 5 : 0;
        score += openFindings <= 5 ? 5 : Math.max(0, 5 - (openFindings - 5) * 0.5);
        
        // Providers (15 points)
        maxScore += 15;
        if (totalProviders > 0) {
          score += (qualifiedProviders / totalProviders) * 10;
          score += providersRequiringRequalification === 0 ? 5 : 0;
        } else {
          score += 15; // No providers = compliant by default
        }
        
        const overallComplianceScore = Math.round((score / maxScore) * 100);
        
        const metrics: PSMFComplianceMetrics = {
          qppvInPlace,
          qppvTrainingCurrent,
          deputyQPPVAvailable,
          totalSystems,
          validatedSystems,
          systemsRequiringRevalidation,
          totalSOPs,
          effectiveSOPs,
          sopsRequiringReview,
          overdueSOPs,
          totalAudits,
          completedAudits,
          openFindings,
          criticalFindings,
          overdueFindings,
          totalProviders,
          qualifiedProviders,
          providersRequiringRequalification,
          activeSdeas,
          totalProducts,
          productsCovered,
          overallComplianceScore,
          lastCalculated: timestamp,
        };
        
        set({ complianceMetrics: metrics });
        
        return metrics;
      },

      // ======================================================================
      // UI
      // ======================================================================
      
      setView: (view) => {
        set({ view });
      },
      
      setFilters: (updates) => {
        set((state) => ({
          filters: { ...state.filters, ...updates },
        }));
      },
      
      clearFilters: () => {
        set({ filters: initialFilters });
      },

      // ======================================================================
      // QUERIES
      // ======================================================================
      
      getQPPVs: () => {
        return Object.values(get().qppvs).sort((a, b) => {
          // Primary first, then deputy, then backup
          const typeOrder = { primary: 0, deputy: 1, backup: 2 };
          return typeOrder[a.type] - typeOrder[b.type];
        });
      },
      
      getPrimaryQPPV: () => {
        const qppvs = Object.values(get().qppvs);
        return qppvs.find(q => q.type === 'primary' && q.status === 'active') || null;
      },
      
      getSystemsByCategory: (category) => {
        return Object.values(get().computerizedSystems)
          .filter(s => s.category === category)
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      
      getSOPsByCategory: (category) => {
        return Object.values(get().sops)
          .filter(s => s.category === category)
          .sort((a, b) => a.documentNumber.localeCompare(b.documentNumber));
      },
      
      getSOPsNeedingReview: () => {
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        return Object.values(get().sops)
          .filter(s => s.nextReviewDate && new Date(s.nextReviewDate) <= thirtyDaysFromNow)
          .sort((a, b) => new Date(a.nextReviewDate!).getTime() - new Date(b.nextReviewDate!).getTime());
      },
      
      getOpenFindings: () => {
        return Object.values(get().audits)
          .flatMap(a => a.findings)
          .filter(f => f.status === 'open' || f.status === 'in-progress')
          .sort((a, b) => {
            // Critical first
            const severityOrder = { critical: 0, major: 1, minor: 2, observation: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
          });
      },
      
      getCriticalFindings: () => {
        return Object.values(get().audits)
          .flatMap(a => a.findings)
          .filter(f => f.severity === 'critical' && f.status !== 'closed');
      },
      
      getActiveProviders: () => {
        return Object.values(get().serviceProviders)
          .filter(p => p.contractStatus === 'active')
          .sort((a, b) => a.name.localeCompare(b.name));
      },
      
      getProductsInPSMF: () => {
        return Object.values(get().authorizedProducts)
          .filter(p => p.includedInPSMF)
          .sort((a, b) => a.productName.localeCompare(b.productName));
      },
    }),
    { name: 'PSMFStore' }
  )
);

export default usePSMFStore;
