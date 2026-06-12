


import { create } from 'zustand';
import { useMemo } from 'react';
import {
  SKU,
  InventoryPosition,
  SuppliabilityStatus,
  SupplyDecision,
  SupplyAlert,
  RiskFactor,
  AuditEntry,
  Region,
  SupplyStatus,
  DecisionType,
  Batch,
  ManufacturingSite,
  ImpactAnalysis,
  ImpactNode,
  nexavantSKUs,
  inventoryPositions,
  suppliabilityStatuses,
  supplyDecisions,
  supplyAlerts,
  nexavantBatches,
  manufacturingSites,
  nexavantImpactAnalysis,
  // v0.4.3 imports
  BatchAction,
  DispositionWorkflow,
  ActionTimelineEntry,
  DispositionDecision,
  getBatchActions,
  getBatchDispositionWorkflow,
  getBatchActionTimeline,
} from '@/data/supply-chain-data';

// ============================================================================
// SUPPLY CHAIN STORE - v0.4.3
// Manages suppliability status, inventory, decisions, batch genealogy, impact analysis & actions
// ============================================================================

export type SupplyChainView = 'dashboard' | 'inventory' | 'decisions' | 'alerts' | 'genealogy' | 'impact' | 'connections' | 'actions';

interface SupplyChainState {
  // View state
  activeView: SupplyChainView;
  selectedSKU: string | null;
  selectedRegion: Region | 'all';
  selectedBatch: string | null;  // v0.4.1
  
  // Data
  skus: SKU[];
  inventoryPositions: InventoryPosition[];
  suppliabilityStatuses: SuppliabilityStatus[];
  decisions: SupplyDecision[];
  alerts: SupplyAlert[];
  batches: Batch[];  // v0.4.1
  manufacturingSites: ManufacturingSite[];  // v0.4.1
  currentImpactAnalysis: ImpactAnalysis | null;  // v0.4.1
  
  // Demo simulation state
  isSimulationActive: boolean;
  simulationStep: number;
  
  // Actions - View
  setActiveView: (view: SupplyChainView) => void;
  setSelectedSKU: (skuId: string | null) => void;
  setSelectedRegion: (region: Region | 'all') => void;
  setSelectedBatch: (batchId: string | null) => void;  // v0.4.1
  
  // Actions - Data
  updateSuppliabilityStatus: (statusId: string, updates: Partial<SuppliabilityStatus>) => void;
  addRiskFactor: (statusId: string, riskFactor: RiskFactor) => void;
  removeRiskFactor: (statusId: string, riskFactorId: string) => void;
  
  // Actions - Decisions
  createDecision: (decision: Omit<SupplyDecision, 'id' | 'auditTrail'>) => string;
  updateDecisionStatus: (decisionId: string, status: SupplyDecision['status'], decidedBy?: string) => void;
  selectDecisionOption: (decisionId: string, optionId: string) => void;
  addDecisionAuditEntry: (decisionId: string, entry: Omit<AuditEntry, 'id'>) => void;
  
  // Actions - Alerts
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => void;
  resolveAlert: (alertId: string) => void;
  createAlert: (alert: Omit<SupplyAlert, 'id' | 'createdAt'>) => string;
  
  // Actions - Inventory
  updateInventoryStatus: (inventoryId: string, status: InventoryPosition['status']) => void;
  
  // Actions - Batch Genealogy (v0.4.1)
  updateBatchStatus: (batchId: string, status: Batch['status']) => void;
  runImpactAnalysis: (batchId: string) => void;
  clearImpactAnalysis: () => void;
  
  // Actions - Simulation (for demo)
  startSimulation: () => void;
  advanceSimulation: () => void;
  resetSimulation: () => void;
  triggerDeviationEvent: () => void;
  
  // Computed getters
  getCriticalAlerts: () => SupplyAlert[];
  getPendingDecisions: () => SupplyDecision[];
  getStatusBySKUAndRegion: (skuId: string, region: Region) => SuppliabilityStatus | undefined;
  getInventoryBySKU: (skuId: string) => InventoryPosition[];
  getBatchById: (batchId: string) => Batch | undefined;  // v0.4.1
  getBatchesByType: (type: Batch['type']) => Batch[];  // v0.4.1
  getDownstreamBatches: (batchId: string) => Batch[];  // v0.4.1
  getUpstreamBatches: (batchId: string) => Batch[];  // v0.4.1
}

export const useSupplyChainStore = create<SupplyChainState>((set, get) => ({
  // Initial view state
  activeView: 'dashboard',
  selectedSKU: null,
  selectedRegion: 'all',
  selectedBatch: null,  // v0.4.1
  
  // Initial data - pre-loaded with Nexavant demo scenario
  skus: nexavantSKUs,
  inventoryPositions: inventoryPositions,
  suppliabilityStatuses: suppliabilityStatuses,
  decisions: supplyDecisions,
  alerts: supplyAlerts,
  batches: nexavantBatches,  // v0.4.1
  manufacturingSites: manufacturingSites,  // v0.4.1
  currentImpactAnalysis: null,  // v0.4.1
  
  // Simulation state
  isSimulationActive: false,
  simulationStep: 0,
  
  // View actions
  setActiveView: (view) => set({ activeView: view }),
  setSelectedSKU: (skuId) => set({ selectedSKU: skuId }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setSelectedBatch: (batchId) => set({ selectedBatch: batchId }),  // v0.4.1
  
  // Data actions
  updateSuppliabilityStatus: (statusId, updates) => {
    set((state) => ({
      suppliabilityStatuses: state.suppliabilityStatuses.map((s) =>
        s.id === statusId ? { ...s, ...updates, lastUpdated: new Date().toISOString() } : s
      ),
    }));
  },
  
  addRiskFactor: (statusId, riskFactor) => {
    set((state) => ({
      suppliabilityStatuses: state.suppliabilityStatuses.map((s) =>
        s.id === statusId
          ? { ...s, riskFactors: [...s.riskFactors, riskFactor], lastUpdated: new Date().toISOString() }
          : s
      ),
    }));
  },
  
  removeRiskFactor: (statusId, riskFactorId) => {
    set((state) => ({
      suppliabilityStatuses: state.suppliabilityStatuses.map((s) =>
        s.id === statusId
          ? { ...s, riskFactors: s.riskFactors.filter((r) => r.id !== riskFactorId), lastUpdated: new Date().toISOString() }
          : s
      ),
    }));
  },
  
  // Decision actions
  createDecision: (decision) => {
    const id = `dec-${Date.now()}`;
    const newDecision: SupplyDecision = {
      ...decision,
      id,
      auditTrail: [
        {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: 'Decision Created',
          user: decision.requestedBy,
          details: `${decision.decisionType} decision created for ${decision.region}`,
        },
      ],
    };
    set((state) => ({ decisions: [newDecision, ...state.decisions] }));
    return id;
  },
  
  updateDecisionStatus: (decisionId, status, decidedBy) => {
    const timestamp = new Date().toISOString();
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === decisionId
          ? {
              ...d,
              status,
              decidedBy: decidedBy || d.decidedBy,
              decidedAt: status === 'approved' || status === 'rejected' ? timestamp : d.decidedAt,
              implementedAt: status === 'implemented' ? timestamp : d.implementedAt,
              auditTrail: [
                ...d.auditTrail,
                {
                  id: `audit-${Date.now()}`,
                  timestamp,
                  action: `Status Changed to ${status.toUpperCase()}`,
                  user: decidedBy || 'System',
                  details: `Decision ${status}`,
                },
              ],
            }
          : d
      ),
    }));
  },
  
  selectDecisionOption: (decisionId, optionId) => {
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === decisionId
          ? {
              ...d,
              selectedOptionId: optionId,
              auditTrail: [
                ...d.auditTrail,
                {
                  id: `audit-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  action: 'Option Selected',
                  user: 'Current User',
                  details: `Selected option: ${d.options?.find((o) => o.id === optionId)?.label}`,
                },
              ],
            }
          : d
      ),
    }));
  },
  
  addDecisionAuditEntry: (decisionId, entry) => {
    set((state) => ({
      decisions: state.decisions.map((d) =>
        d.id === decisionId
          ? {
              ...d,
              auditTrail: [...d.auditTrail, { ...entry, id: `audit-${Date.now()}` }],
            }
          : d
      ),
    }));
  },
  
  // Alert actions
  acknowledgeAlert: (alertId, acknowledgedBy) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId
          ? { ...a, acknowledgedAt: new Date().toISOString(), acknowledgedBy }
          : a
      ),
    }));
  },
  
  resolveAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, resolved: true } : a
      ),
    }));
  },
  
  createAlert: (alert) => {
    const id = `alert-${Date.now()}`;
    const newAlert: SupplyAlert = {
      ...alert,
      id,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ alerts: [newAlert, ...state.alerts] }));
    return id;
  },
  
  // Inventory actions
  updateInventoryStatus: (inventoryId, status) => {
    set((state) => ({
      inventoryPositions: state.inventoryPositions.map((i) =>
        i.id === inventoryId
          ? { ...i, status, lastUpdated: new Date().toISOString() }
          : i
      ),
    }));
  },
  
  // Batch Genealogy actions (v0.4.1)
  updateBatchStatus: (batchId, status) => {
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id === batchId ? { ...b, status } : b
      ),
    }));
  },
  
  runImpactAnalysis: (batchId) => {
    const state = get();
    const batch = state.batches.find(b => b.id === batchId);
    if (!batch) return;
    
    // For demo, use pre-calculated analysis for the problem batch
    if (batch.batchNumber === 'DS-LIG2847-003') {
      set({ currentImpactAnalysis: nexavantImpactAnalysis });
      return;
    }
    
    // Generate dynamic impact analysis for other batches
    const downstreamImpacts: ImpactNode[] = [];
    const upstreamImpacts: ImpactNode[] = [];
    
    // Find downstream batches recursively
    const findDownstream = (b: Batch, depth: number) => {
      for (const childId of b.childBatchIds) {
        const child = state.batches.find(c => c.id === childId);
        if (child) {
          downstreamImpacts.push({
            entityId: child.id,
            entityType: 'batch',
            name: `${child.batchNumber}`,
            status: child.status === 'quarantine' || child.status === 'rejected' ? 'affected' : 'at-risk',
            impact: depth === 1 ? 'direct' : 'indirect',
            description: `${child.quantity} ${child.unit} ${child.type} - manufactured from affected upstream batch`,
            depth,
          });
          if (depth < 5) findDownstream(child, depth + 1);
        }
      }
    };
    
    // Find upstream batches recursively
    const findUpstream = (b: Batch, depth: number) => {
      for (const parentId of b.parentBatchIds) {
        const parent = state.batches.find(p => p.id === parentId);
        if (parent) {
          upstreamImpacts.push({
            entityId: parent.id,
            entityType: 'batch',
            name: `${parent.batchNumber}`,
            status: 'at-risk',
            impact: depth === 1 ? 'direct' : 'indirect',
            description: `${parent.quantity} ${parent.unit} ${parent.type} - source material for affected batch`,
            depth,
          });
          if (depth < 5) findUpstream(parent, depth + 1);
        }
      }
    };
    
    findDownstream(batch, 1);
    findUpstream(batch, 1);
    
    const analysis: ImpactAnalysis = {
      sourceEntityId: batch.id,
      sourceEntityType: 'batch',
      sourceDescription: `Batch ${batch.batchNumber} - ${batch.status}`,
      analysisTimestamp: new Date().toISOString(),
      upstreamImpacts,
      downstreamImpacts,
      patientImpact: {
        regionsAffected: downstreamImpacts.length > 0 ? ['EU'] : [],
        estimatedPatientsAffected: downstreamImpacts.length * 100,
        supplyGapWeeks: downstreamImpacts.length > 0 ? 2 : 0,
      },
      mitigationOptions: [
        'Review and assess batch disposition options',
        'Expedite backup manufacturing if needed',
        'Notify relevant health authorities as required',
      ],
    };
    
    set({ currentImpactAnalysis: analysis });
  },
  
  clearImpactAnalysis: () => {
    set({ currentImpactAnalysis: null });
  },
  
  // Simulation actions (for investor demo)
  startSimulation: () => {
    set({ isSimulationActive: true, simulationStep: 0 });
  },
  
  advanceSimulation: () => {
    set((state) => ({ simulationStep: state.simulationStep + 1 }));
  },
  
  resetSimulation: () => {
    // Reset to initial state
    set({
      isSimulationActive: false,
      simulationStep: 0,
      skus: nexavantSKUs,
      inventoryPositions: inventoryPositions,
      suppliabilityStatuses: suppliabilityStatuses,
      decisions: supplyDecisions,
      alerts: supplyAlerts,
      batches: nexavantBatches,
      currentImpactAnalysis: null,
    });
  },
  
  // Live demo: Trigger a QC deviation event
  triggerDeviationEvent: () => {
    const timestamp = new Date().toISOString();
    const state = get();
    
    // 1. Create new alert
    const alertId = `alert-sim-${Date.now()}`;
    const newAlert: SupplyAlert = {
      id: alertId,
      type: 'risk',
      severity: 'critical',
      title: '🔴 LIVE: QC Deviation Detected',
      message: 'OOS result for Batch DS-LIG2847-003 Impurity A testing. Immediate assessment required.',
      skuId: 'sku-nxv-100-eu',
      region: 'EU',
      sourceModule: 'qms',
      sourceEventId: 'DEV-2026-LIVE',
      createdAt: timestamp,
      resolved: false,
    };
    
    // 2. Update inventory to quarantine
    const updatedInventory = state.inventoryPositions.map((i) =>
      i.id === 'inv-eu-100-api' ? { ...i, status: 'quarantine' as const, lastUpdated: timestamp } : i
    );
    
    // 3. Update suppliability status to RED
    const updatedStatuses = state.suppliabilityStatuses.map((s) =>
      s.id === 'status-nxv-100-eu'
        ? {
            ...s,
            status: 'red' as SupplyStatus,
            weeksOfSupply: 6,
            projectedStockoutDate: '2026-02-15',
            trend: 'declining' as const,
            lastUpdated: timestamp,
            riskFactors: [
              ...s.riskFactors,
              {
                id: `risk-sim-${Date.now()}`,
                type: 'deviation' as const,
                severity: 'critical' as const,
                description: '[LIVE SIMULATION] API Batch DS-LIG2847-003 quarantined due to OOS impurity result.',
                sourceModule: 'qms',
                sourceEntityId: 'DEV-2026-LIVE',
                identifiedAt: timestamp,
                mitigationStatus: 'unmitigated' as const,
              },
            ],
          }
        : s
    );
    
    // 4. Create pending decision
    const newDecision: SupplyDecision = {
      id: `dec-sim-${Date.now()}`,
      skuId: 'sku-nxv-100-eu',
      region: 'EU',
      decisionType: 'hold',
      status: 'pending',
      priority: 'critical',
      rationale: '[LIVE SIMULATION] Batch disposition decision required following QC deviation.',
      linkedDeviationId: 'DEV-2026-LIVE',
      linkedBatchId: 'DS-LIG2847-003',
      impactAssessment: 'Supply impact assessment in progress...',
      options: [
        {
          id: 'opt-sim-1',
          label: 'Release with Justification',
          description: 'Accept batch with documented scientific rationale.',
          riskLevel: 'medium',
          timeToImplement: '2-3 days',
          estimatedImpact: 'Supply maintained. Regulatory risk.',
        },
        {
          id: 'opt-sim-2',
          label: 'Reject & Expedite',
          description: 'Reject batch and expedite replacement manufacturing.',
          riskLevel: 'low',
          timeToImplement: '6-8 weeks',
          estimatedImpact: '4-week supply gap.',
        },
      ],
      requestedBy: 'System (Auto-Generated)',
      requestedAt: timestamp,
      auditTrail: [
        {
          id: `audit-sim-${Date.now()}`,
          timestamp,
          action: '[LIVE] Deviation Event Received',
          user: 'Cross-Module Event Bus',
          details: 'QMS deviation triggered supply chain assessment',
          linkedEntityType: 'deviation',
          linkedEntityId: 'DEV-2026-LIVE',
        },
      ],
    };
    
    set({
      alerts: [newAlert, ...state.alerts],
      inventoryPositions: updatedInventory,
      suppliabilityStatuses: updatedStatuses,
      decisions: [newDecision, ...state.decisions],
      isSimulationActive: true,
    });
  },
  
  // Computed getters
  getCriticalAlerts: () => {
    return get().alerts.filter((a) => a.severity === 'critical' && !a.resolved);
  },
  
  getPendingDecisions: () => {
    return get().decisions.filter((d) => d.status === 'pending');
  },
  
  getStatusBySKUAndRegion: (skuId, region) => {
    return get().suppliabilityStatuses.find((s) => s.skuId === skuId && s.region === region);
  },
  
  getInventoryBySKU: (skuId) => {
    return get().inventoryPositions.filter((i) => i.skuId === skuId);
  },
  
  // Batch genealogy getters (v0.4.1)
  getBatchById: (batchId) => {
    return get().batches.find((b) => b.id === batchId);
  },
  
  getBatchesByType: (type) => {
    return get().batches.filter((b) => b.type === type);
  },
  
  getDownstreamBatches: (batchId) => {
    const state = get();
    const batch = state.batches.find((b) => b.id === batchId);
    if (!batch) return [];
    return state.batches.filter((b) => batch.childBatchIds.includes(b.id));
  },
  
  getUpstreamBatches: (batchId) => {
    const state = get();
    const batch = state.batches.find((b) => b.id === batchId);
    if (!batch) return [];
    return state.batches.filter((b) => batch.parentBatchIds.includes(b.id));
  },
}));

// ============================================================================
// SELECTOR HOOKS (stable references to prevent re-renders)
// ============================================================================

const EMPTY_ALERTS: SupplyAlert[] = [];
const EMPTY_DECISIONS: SupplyDecision[] = [];

export const useCriticalAlerts = () => {
  const alerts = useSupplyChainStore((state) => state.alerts);
  return useMemo(
    () => alerts.filter((a) => a.severity === 'critical' && !a.resolved),
    [alerts]
  );
};

export const usePendingDecisions = () => {
  const decisions = useSupplyChainStore((state) => state.decisions);
  return useMemo(
    () => decisions.filter((d) => d.status === 'pending'),
    [decisions]
  );
};

export const useFilteredStatuses = () => {
  const statuses = useSupplyChainStore((state) => state.suppliabilityStatuses);
  const selectedRegion = useSupplyChainStore((state) => state.selectedRegion);
  const selectedSKU = useSupplyChainStore((state) => state.selectedSKU);
  
  return useMemo(() => {
    let filtered = statuses;
    if (selectedRegion !== 'all') {
      filtered = filtered.filter((s) => s.region === selectedRegion);
    }
    if (selectedSKU) {
      filtered = filtered.filter((s) => s.skuId === selectedSKU);
    }
    return filtered;
  }, [statuses, selectedRegion, selectedSKU]);
};

// ============================================================================
// BATCH GENEALOGY SELECTOR HOOKS (v0.4.1)
// ============================================================================

export const useBatchesByType = (type: Batch['type']) => {
  const batches = useSupplyChainStore((state) => state.batches);
  return useMemo(() => batches.filter((b) => b.type === type), [batches, type]);
};

export const useAffectedBatches = () => {
  const batches = useSupplyChainStore((state) => state.batches);
  return useMemo(
    () => batches.filter((b) => b.status === 'quarantine' || b.status === 'rejected'),
    [batches]
  );
};

export const useBatchGenealogyChain = (batchId: string | null) => {
  const batches = useSupplyChainStore((state) => state.batches);
  
  return useMemo(() => {
    if (!batchId) return { upstream: [], current: null, downstream: [] };
    
    const current = batches.find((b) => b.id === batchId);
    if (!current) return { upstream: [], current: null, downstream: [] };
    
    // Get upstream batches (parents)
    const upstream: Batch[] = [];
    const visited = new Set<string>();
    
    const findUpstream = (batch: Batch) => {
      for (const parentId of batch.parentBatchIds) {
        if (visited.has(parentId)) continue;
        visited.add(parentId);
        const parent = batches.find((b) => b.id === parentId);
        if (parent) {
          upstream.push(parent);
          findUpstream(parent);
        }
      }
    };
    
    // Get downstream batches (children)
    const downstream: Batch[] = [];
    visited.clear();
    
    const findDownstream = (batch: Batch) => {
      for (const childId of batch.childBatchIds) {
        if (visited.has(childId)) continue;
        visited.add(childId);
        const child = batches.find((b) => b.id === childId);
        if (child) {
          downstream.push(child);
          findDownstream(child);
        }
      }
    };
    
    findUpstream(current);
    findDownstream(current);
    
    return { upstream, current, downstream };
  }, [batches, batchId]);
};

export const useCurrentImpactAnalysis = () => {
  return useSupplyChainStore((state) => state.currentImpactAnalysis);
};
