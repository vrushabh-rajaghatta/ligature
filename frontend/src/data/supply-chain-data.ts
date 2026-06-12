// Supply Chain Module Data - v0.4.3
// Suppliability Status Center with Action Center & Disposition Workflows

// ============================================================================
// TYPES
// ============================================================================

export type Region = 'US' | 'EU' | 'JP' | 'CN' | 'ROW';

// ============================================================================
// ACTION CENTER TYPES (v0.4.3)
// ============================================================================

export type ActionType = 
  | 'create-capa' 
  | 'draft-notification' 
  | 'escalate-disposition' 
  | 'schedule-review'
  | 'request-investigation'
  | 'update-label'
  | 'initiate-recall'
  | 'notify-stakeholder';

export type ActionStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

export type DispositionDecision = 'release' | 'reject' | 'hold' | 'rework' | 'quarantine';

export interface QuickAction {
  id: string;
  type: ActionType;
  label: string;
  description: string;
  icon: string;
  targetModule: string;
  requiredFields: string[];
  autoPopulateFrom?: string[];  // Fields to auto-populate from source entity
}

export interface BatchAction {
  id: string;
  batchId: string;
  actionType: ActionType;
  status: ActionStatus;
  title: string;
  description: string;
  targetModule: string;
  targetEntityId?: string;
  targetEntityType?: string;
  createdAt: string;
  createdBy: string;
  completedAt?: string;
  completedBy?: string;
  linkedFromConnectionId?: string;  // Which connection triggered this
  resultingEntityId?: string;  // The CAPA/notification/etc that was created
  notes?: string;
}

export interface DispositionWorkflow {
  id: string;
  batchId: string;
  batchNumber: string;
  currentStatus: 'awaiting-review' | 'under-review' | 'pending-decision' | 'decided' | 'implemented';
  decision?: DispositionDecision;
  decisionRationale?: string;
  requiredApprovers: string[];
  approvals: DispositionApproval[];
  prerequisites: DispositionPrerequisite[];
  stakeholderNotifications: StakeholderNotification[];
  createdAt: string;
  createdBy: string;
  decidedAt?: string;
  decidedBy?: string;
  implementedAt?: string;
  slaDeadline: string;
  isOverdue: boolean;
}

export interface DispositionApproval {
  id: string;
  role: string;
  approverName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'deferred';
  timestamp?: string;
  comments?: string;
}

export interface DispositionPrerequisite {
  id: string;
  type: 'investigation' | 'capa' | 'document-review' | 'lab-result' | 'regulatory-check';
  description: string;
  status: 'pending' | 'complete' | 'waived';
  linkedEntityId?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface StakeholderNotification {
  id: string;
  stakeholderRole: string;
  stakeholderName?: string;
  notificationType: 'email' | 'system' | 'meeting';
  status: 'pending' | 'sent' | 'acknowledged';
  sentAt?: string;
  acknowledgedAt?: string;
}

export interface ActionTimelineEntry {
  id: string;
  batchId: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  actionType?: ActionType;
  resultingEntityId?: string;
  resultingEntityType?: string;
  module?: string;
}

// ============================================================================
// BATCH GENEALOGY TYPES (v0.4.1)
// ============================================================================

export type BatchType = 'api' | 'intermediate' | 'bulk-ds' | 'drug-product' | 'packaged';

export type BatchStatus = 'in-production' | 'released' | 'quarantine' | 'rejected' | 'expired' | 'recalled';

export interface ManufacturingSite {
  id: string;
  name: string;
  country: string;
  siteCode: string;
  capabilities: BatchType[];
  isApproved: boolean;
}

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  type: BatchType;
  status: BatchStatus;
  quantity: number;
  unit: string;
  manufacturingSiteId: string;
  manufacturingDate: string;
  expiryDate: string;
  parentBatchIds: string[];  // Upstream batches (inputs)
  childBatchIds: string[];   // Downstream batches (outputs)
  deviationIds: string[];    // Linked QMS deviations
  capaIds: string[];         // Linked CAPAs
  specifications: Record<string, { value: number; spec: string; result: 'pass' | 'fail' | 'pending' }>;
  releaseDate?: string;
  releasedBy?: string;
}

export interface ImpactNode {
  entityId: string;
  entityType: 'batch' | 'inventory' | 'sku' | 'decision' | 'deviation' | 'patient-supply';
  name: string;
  status: 'affected' | 'at-risk' | 'safe';
  impact: 'direct' | 'indirect';
  description: string;
  depth: number;  // Distance from source issue
}

export interface ImpactAnalysis {
  sourceEntityId: string;
  sourceEntityType: string;
  sourceDescription: string;
  analysisTimestamp: string;
  upstreamImpacts: ImpactNode[];
  downstreamImpacts: ImpactNode[];
  patientImpact: {
    regionsAffected: Region[];
    estimatedPatientsAffected: number;
    supplyGapWeeks: number;
  };
  mitigationOptions: string[];
}

export type SupplyStatus = 'green' | 'amber' | 'red';

export type InventoryTier = 'api' | 'bulk' | 'finished-product' | 'distribution';

export type DecisionType = 'release' | 'hold' | 'expedite' | 'source-switch' | 'notify-ha' | 'recall';

export interface SKU {
  id: string;
  productId: string;
  productName: string;
  name: string;
  ndc: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  regions: Region[];
  status: 'active' | 'discontinued' | 'pending-launch';
  launchDate?: string;
}

export interface InventoryPosition {
  id: string;
  skuId: string;
  region: Region;
  tier: InventoryTier;
  quantity: number;
  unit: string;
  expiryDate: string;
  batchIds: string[];
  status: 'available' | 'quarantine' | 'hold' | 'expired';
  lastUpdated: string;
}

export interface RiskFactor {
  id: string;
  type: 'deviation' | 'supplier' | 'demand-spike' | 'expiry' | 'regulatory' | 'capacity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  sourceModule?: string;
  sourceEntityId?: string;
  identifiedAt: string;
  mitigationStatus: 'unmitigated' | 'in-progress' | 'mitigated';
}

export interface SuppliabilityStatus {
  id: string;
  skuId: string;
  region: Region;
  status: SupplyStatus;
  weeksOfSupply: number;
  projectedStockoutDate?: string;
  riskFactors: RiskFactor[];
  lastUpdated: string;
  trend: 'improving' | 'stable' | 'declining';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
}

export interface SupplyDecision {
  id: string;
  skuId: string;
  region: Region;
  decisionType: DecisionType;
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  priority: 'routine' | 'urgent' | 'critical';
  rationale: string;
  linkedDeviationId?: string;
  linkedBatchId?: string;
  impactAssessment: string;
  options?: DecisionOption[];
  selectedOptionId?: string;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  implementedAt?: string;
  auditTrail: AuditEntry[];
}

export interface DecisionOption {
  id: string;
  label: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  timeToImplement: string;
  estimatedImpact: string;
}

export interface SupplyAlert {
  id: string;
  type: 'risk' | 'decision-required' | 'status-change' | 'regulatory';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  skuId?: string;
  region?: Region;
  sourceModule?: string;
  sourceEventId?: string;
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolved: boolean;
}

// ============================================================================
// NEXAVANT (LIG-2847) DEMO DATA
// ============================================================================

export const nexavantSKUs: SKU[] = [
  {
    id: 'sku-nxv-100-us',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    name: 'Nexavant 100mg Tablets',
    ndc: '12345-100-30',
    strength: '100mg',
    dosageForm: 'Film-coated tablet',
    packSize: '30 tablets',
    regions: ['US'],
    status: 'pending-launch',
    launchDate: '2026-06-15',
  },
  {
    id: 'sku-nxv-100-eu',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    name: 'Nexavant 100mg Tablets',
    ndc: 'EU/1/26/001/001',
    strength: '100mg',
    dosageForm: 'Film-coated tablet',
    packSize: '28 tablets',
    regions: ['EU'],
    status: 'pending-launch',
    launchDate: '2026-09-01',
  },
  {
    id: 'sku-nxv-50-us',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    name: 'Nexavant 50mg Tablets',
    ndc: '12345-050-30',
    strength: '50mg',
    dosageForm: 'Film-coated tablet',
    packSize: '30 tablets',
    regions: ['US'],
    status: 'pending-launch',
    launchDate: '2026-06-15',
  },
  {
    id: 'sku-nxv-50-eu',
    productId: 'LIG-2847',
    productName: 'Nexavant',
    name: 'Nexavant 50mg Tablets',
    ndc: 'EU/1/26/001/002',
    strength: '50mg',
    dosageForm: 'Film-coated tablet',
    packSize: '28 tablets',
    regions: ['EU'],
    status: 'pending-launch',
    launchDate: '2026-09-01',
  },
];

// Inventory positions - showing healthy US, at-risk EU
export const inventoryPositions: InventoryPosition[] = [
  // US 100mg - healthy
  {
    id: 'inv-us-100-api',
    skuId: 'sku-nxv-100-us',
    region: 'US',
    tier: 'api',
    quantity: 150,
    unit: 'kg',
    expiryDate: '2028-06-30',
    batchIds: ['DS-LIG2847-001', 'DS-LIG2847-002'],
    status: 'available',
    lastUpdated: '2026-01-02T08:00:00Z',
  },
  {
    id: 'inv-us-100-fp',
    skuId: 'sku-nxv-100-us',
    region: 'US',
    tier: 'finished-product',
    quantity: 50000,
    unit: 'units',
    expiryDate: '2027-12-31',
    batchIds: ['DP-LIG2847-US-001', 'DP-LIG2847-US-002'],
    status: 'available',
    lastUpdated: '2026-01-02T08:00:00Z',
  },
  // EU 100mg - AT RISK due to batch issue
  {
    id: 'inv-eu-100-api',
    skuId: 'sku-nxv-100-eu',
    region: 'EU',
    tier: 'api',
    quantity: 25,
    unit: 'kg',
    expiryDate: '2028-03-31',
    batchIds: ['DS-LIG2847-003'], // THE PROBLEM BATCH
    status: 'quarantine', // Quarantined pending investigation
    lastUpdated: '2026-01-02T10:30:00Z',
  },
  {
    id: 'inv-eu-100-fp',
    skuId: 'sku-nxv-100-eu',
    region: 'EU',
    tier: 'finished-product',
    quantity: 18000,
    unit: 'units',
    expiryDate: '2027-09-30',
    batchIds: ['DP-LIG2847-EU-001'],
    status: 'available',
    lastUpdated: '2026-01-02T08:00:00Z',
  },
  // US 50mg - healthy
  {
    id: 'inv-us-50-fp',
    skuId: 'sku-nxv-50-us',
    region: 'US',
    tier: 'finished-product',
    quantity: 35000,
    unit: 'units',
    expiryDate: '2027-12-31',
    batchIds: ['DP-LIG2847-US-050-001'],
    status: 'available',
    lastUpdated: '2026-01-02T08:00:00Z',
  },
];

// Pre-loaded crisis scenario: EU supply at risk
export const suppliabilityStatuses: SuppliabilityStatus[] = [
  {
    id: 'status-nxv-100-us',
    skuId: 'sku-nxv-100-us',
    region: 'US',
    status: 'green',
    weeksOfSupply: 24,
    riskFactors: [],
    lastUpdated: '2026-01-02T08:00:00Z',
    trend: 'stable',
  },
  {
    id: 'status-nxv-100-eu',
    skuId: 'sku-nxv-100-eu',
    region: 'EU',
    status: 'red', // CRISIS STATE
    weeksOfSupply: 6,
    projectedStockoutDate: '2026-02-15',
    riskFactors: [
      {
        id: 'risk-001',
        type: 'deviation',
        severity: 'critical',
        description: 'API Batch DS-LIG2847-003 quarantined due to OOS impurity result. This batch supplies 60% of EU finished product pipeline.',
        sourceModule: 'qms',
        sourceEntityId: 'DEV-2026-0042',
        identifiedAt: '2026-01-02T09:15:00Z',
        mitigationStatus: 'unmitigated',
      },
    ],
    lastUpdated: '2026-01-02T10:30:00Z',
    trend: 'declining',
  },
  {
    id: 'status-nxv-50-us',
    skuId: 'sku-nxv-50-us',
    region: 'US',
    status: 'green',
    weeksOfSupply: 18,
    riskFactors: [],
    lastUpdated: '2026-01-02T08:00:00Z',
    trend: 'stable',
  },
  {
    id: 'status-nxv-50-eu',
    skuId: 'sku-nxv-50-eu',
    region: 'EU',
    status: 'amber',
    weeksOfSupply: 10,
    riskFactors: [
      {
        id: 'risk-002',
        type: 'demand-spike',
        severity: 'medium',
        description: 'Projected 15% demand increase following competitor supply issues',
        identifiedAt: '2025-12-20T14:00:00Z',
        mitigationStatus: 'in-progress',
      },
    ],
    lastUpdated: '2026-01-02T08:00:00Z',
    trend: 'stable',
  },
];

// Pre-loaded pending decision for demo
export const supplyDecisions: SupplyDecision[] = [
  {
    id: 'dec-001',
    skuId: 'sku-nxv-100-eu',
    region: 'EU',
    decisionType: 'hold',
    status: 'pending',
    priority: 'critical',
    rationale: 'API Batch DS-LIG2847-003 shows OOS result for Impurity A (0.18% vs spec ≤0.15%). Root cause investigation ongoing. Decision required on batch disposition and supply continuity.',
    linkedDeviationId: 'DEV-2026-0042',
    linkedBatchId: 'DS-LIG2847-003',
    impactAssessment: 'If batch rejected: EU 100mg supply exhausted by mid-February. ~2,500 patients potentially affected. EMA notification required under Article 23a if shortage confirmed.',
    options: [
      {
        id: 'opt-1',
        label: 'Release with Justification',
        description: 'Accept batch with documented scientific rationale. Impurity A at 0.18% is within toxicological limits. Requires QA head approval and batch-specific release documentation.',
        riskLevel: 'medium',
        timeToImplement: '2-3 days',
        estimatedImpact: 'Supply maintained. Regulatory risk if questioned during inspection.',
      },
      {
        id: 'opt-2',
        label: 'Reject & Expedite Backup',
        description: 'Reject batch. Expedite manufacturing of replacement batch at Site B (Ireland). Emergency campaign scheduling required.',
        riskLevel: 'low',
        timeToImplement: '6-8 weeks',
        estimatedImpact: '4-week supply gap. Patient notification required. Commercial impact ~€2.1M.',
      },
      {
        id: 'opt-3',
        label: 'Notify EMA of Potential Shortage',
        description: 'Proactive notification to EMA per Article 23a. Demonstrates compliance. May trigger additional scrutiny but builds regulatory trust.',
        riskLevel: 'low',
        timeToImplement: '24-48 hours',
        estimatedImpact: 'Regulatory relationship preserved. Public disclosure possible.',
      },
    ],
    requestedBy: 'Maria Santos',
    requestedAt: '2026-01-02T10:45:00Z',
    auditTrail: [
      {
        id: 'audit-001',
        timestamp: '2026-01-02T09:15:00Z',
        action: 'Deviation Raised',
        user: 'QC Lab System',
        details: 'OOS result detected for Batch DS-LIG2847-003 Impurity A testing',
        linkedEntityType: 'deviation',
        linkedEntityId: 'DEV-2026-0042',
      },
      {
        id: 'audit-002',
        timestamp: '2026-01-02T09:30:00Z',
        action: 'Batch Quarantined',
        user: 'James Wilson',
        details: 'Batch placed on quality hold pending investigation',
        linkedEntityType: 'batch',
        linkedEntityId: 'DS-LIG2847-003',
      },
      {
        id: 'audit-003',
        timestamp: '2026-01-02T10:00:00Z',
        action: 'Supply Impact Assessment',
        user: 'Supply Chain System',
        details: 'Automated impact analysis: EU 100mg supply projected to exhaust in 6 weeks if batch rejected',
      },
      {
        id: 'audit-004',
        timestamp: '2026-01-02T10:30:00Z',
        action: 'Status Escalated to RED',
        user: 'Supply Chain System',
        details: 'Suppliability status changed from AMBER to RED. Critical decision required.',
      },
      {
        id: 'audit-005',
        timestamp: '2026-01-02T10:45:00Z',
        action: 'Decision Request Created',
        user: 'Maria Santos',
        details: 'Cross-functional decision required. Escalated to Supply Review Board.',
      },
    ],
  },
];

// Active alerts for the dashboard
export const supplyAlerts: SupplyAlert[] = [
  {
    id: 'alert-001',
    type: 'risk',
    severity: 'critical',
    title: 'EU Nexavant 100mg Supply Critical',
    message: 'Projected stockout in 6 weeks. API batch quarantined. Immediate decision required.',
    skuId: 'sku-nxv-100-eu',
    region: 'EU',
    sourceModule: 'qms',
    sourceEventId: 'DEV-2026-0042',
    createdAt: '2026-01-02T10:30:00Z',
    resolved: false,
  },
  {
    id: 'alert-002',
    type: 'decision-required',
    severity: 'critical',
    title: 'Batch Disposition Decision Pending',
    message: 'DS-LIG2847-003: Release with justification, reject, or notify EMA? SRB review required.',
    skuId: 'sku-nxv-100-eu',
    region: 'EU',
    createdAt: '2026-01-02T10:45:00Z',
    resolved: false,
  },
  {
    id: 'alert-003',
    type: 'status-change',
    severity: 'warning',
    title: 'EU Nexavant 50mg Demand Increase',
    message: 'Competitor supply issues may drive 15% demand spike. Monitor inventory levels.',
    skuId: 'sku-nxv-50-eu',
    region: 'EU',
    createdAt: '2025-12-20T14:00:00Z',
    acknowledgedAt: '2025-12-20T16:30:00Z',
    acknowledgedBy: 'Supply Planning Team',
    resolved: false,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getStatusColor(status: SupplyStatus): string {
  switch (status) {
    case 'green': return 'text-green-500';
    case 'amber': return 'text-amber-500';
    case 'red': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

export function getStatusBgColor(status: SupplyStatus): string {
  switch (status) {
    case 'green': return 'bg-green-500/10 border-green-500/30';
    case 'amber': return 'bg-amber-500/10 border-amber-500/30';
    case 'red': return 'bg-red-500/10 border-red-500/30';
    default: return 'bg-gray-500/10 border-gray-500/30';
  }
}

export function getSeverityColor(severity: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (severity) {
    case 'low': return 'text-blue-500';
    case 'medium': return 'text-amber-500';
    case 'high': return 'text-orange-500';
    case 'critical': return 'text-red-500';
    default: return 'text-gray-500';
  }
}

export function formatRegion(region: Region): string {
  switch (region) {
    case 'US': return 'United States';
    case 'EU': return 'European Union';
    case 'JP': return 'Japan';
    case 'CN': return 'China';
    case 'ROW': return 'Rest of World';
    default: return region;
  }
}

export function getTierLabel(tier: InventoryTier): string {
  switch (tier) {
    case 'api': return 'API / Drug Substance';
    case 'bulk': return 'Bulk Product';
    case 'finished-product': return 'Finished Product';
    case 'distribution': return 'Distribution Center';
    default: return tier;
  }
}

// ============================================================================
// MANUFACTURING SITES (v0.4.1)
// ============================================================================

export const manufacturingSites: ManufacturingSite[] = [
  {
    id: 'site-api-india',
    name: 'Pharma Synth India Pvt Ltd',
    country: 'India',
    siteCode: 'PSI-MUM',
    capabilities: ['api', 'intermediate'],
    isApproved: true,
  },
  {
    id: 'site-api-ireland',
    name: 'Celtic Pharma Manufacturing',
    country: 'Ireland',
    siteCode: 'CPM-CRK',
    capabilities: ['api', 'intermediate', 'bulk-ds'],
    isApproved: true,
  },
  {
    id: 'site-dp-germany',
    name: 'EuroMed Pharma GmbH',
    country: 'Germany',
    siteCode: 'EMP-FRA',
    capabilities: ['drug-product', 'packaged'],
    isApproved: true,
  },
  {
    id: 'site-dp-us',
    name: 'Ligature Manufacturing Inc',
    country: 'USA',
    siteCode: 'LMI-NJ',
    capabilities: ['drug-product', 'packaged'],
    isApproved: true,
  },
  {
    id: 'site-pack-belgium',
    name: 'BeneluxPack NV',
    country: 'Belgium',
    siteCode: 'BPK-ANT',
    capabilities: ['packaged'],
    isApproved: true,
  },
];

// ============================================================================
// BATCH GENEALOGY - NEXAVANT DEMO DATA (v0.4.1)
// ============================================================================
// Shows the complete manufacturing chain:
// API (India) → Bulk DS (Ireland) → Drug Product (Germany/US) → Packaged (Belgium/NJ)

export const nexavantBatches: Batch[] = [
  // ===== API BATCHES (India) =====
  {
    id: 'batch-api-001',
    batchNumber: 'DS-LIG2847-001',
    productId: 'LIG-2847',
    type: 'api',
    status: 'released',
    quantity: 75,
    unit: 'kg',
    manufacturingSiteId: 'site-api-india',
    manufacturingDate: '2025-08-15',
    expiryDate: '2028-08-14',
    parentBatchIds: [],
    childBatchIds: ['batch-bulk-001', 'batch-bulk-002'],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Assay': { value: 99.8, spec: '≥99.0%', result: 'pass' },
      'Impurity A': { value: 0.05, spec: '≤0.15%', result: 'pass' },
      'Impurity B': { value: 0.02, spec: '≤0.10%', result: 'pass' },
      'Water Content': { value: 0.3, spec: '≤0.5%', result: 'pass' },
    },
    releaseDate: '2025-08-25',
    releasedBy: 'Ravi Patel',
  },
  {
    id: 'batch-api-002',
    batchNumber: 'DS-LIG2847-002',
    productId: 'LIG-2847',
    type: 'api',
    status: 'released',
    quantity: 75,
    unit: 'kg',
    manufacturingSiteId: 'site-api-india',
    manufacturingDate: '2025-09-10',
    expiryDate: '2028-09-09',
    parentBatchIds: [],
    childBatchIds: ['batch-bulk-003'],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Assay': { value: 99.6, spec: '≥99.0%', result: 'pass' },
      'Impurity A': { value: 0.08, spec: '≤0.15%', result: 'pass' },
      'Impurity B': { value: 0.03, spec: '≤0.10%', result: 'pass' },
      'Water Content': { value: 0.4, spec: '≤0.5%', result: 'pass' },
    },
    releaseDate: '2025-09-20',
    releasedBy: 'Ravi Patel',
  },
  {
    id: 'batch-api-003',
    batchNumber: 'DS-LIG2847-003',  // THE PROBLEM BATCH
    productId: 'LIG-2847',
    type: 'api',
    status: 'quarantine',
    quantity: 50,
    unit: 'kg',
    manufacturingSiteId: 'site-api-india',
    manufacturingDate: '2025-11-20',
    expiryDate: '2028-11-19',
    parentBatchIds: [],
    childBatchIds: ['batch-bulk-004'],  // Already used in bulk production!
    deviationIds: ['DEV-2026-0042'],
    capaIds: ['CAPA-2026-0015'],
    specifications: {
      'Assay': { value: 99.5, spec: '≥99.0%', result: 'pass' },
      'Impurity A': { value: 0.18, spec: '≤0.15%', result: 'fail' },  // OOS!
      'Impurity B': { value: 0.04, spec: '≤0.10%', result: 'pass' },
      'Water Content': { value: 0.35, spec: '≤0.5%', result: 'pass' },
    },
    // Not released due to OOS
  },

  // ===== BULK DRUG SUBSTANCE BATCHES (Ireland) =====
  {
    id: 'batch-bulk-001',
    batchNumber: 'BLK-LIG2847-001',
    productId: 'LIG-2847',
    type: 'bulk-ds',
    status: 'released',
    quantity: 35,
    unit: 'kg',
    manufacturingSiteId: 'site-api-ireland',
    manufacturingDate: '2025-09-01',
    expiryDate: '2027-08-31',
    parentBatchIds: ['batch-api-001'],
    childBatchIds: ['batch-dp-us-001'],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Blend Uniformity': { value: 98.5, spec: '≥95.0%', result: 'pass' },
      'Moisture': { value: 2.1, spec: '≤3.0%', result: 'pass' },
    },
    releaseDate: '2025-09-10',
    releasedBy: 'Siobhan O\'Brien',
  },
  {
    id: 'batch-bulk-002',
    batchNumber: 'BLK-LIG2847-002',
    productId: 'LIG-2847',
    type: 'bulk-ds',
    status: 'released',
    quantity: 35,
    unit: 'kg',
    manufacturingSiteId: 'site-api-ireland',
    manufacturingDate: '2025-09-15',
    expiryDate: '2027-09-14',
    parentBatchIds: ['batch-api-001'],
    childBatchIds: ['batch-dp-us-002'],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Blend Uniformity': { value: 97.8, spec: '≥95.0%', result: 'pass' },
      'Moisture': { value: 2.3, spec: '≤3.0%', result: 'pass' },
    },
    releaseDate: '2025-09-25',
    releasedBy: 'Siobhan O\'Brien',
  },
  {
    id: 'batch-bulk-003',
    batchNumber: 'BLK-LIG2847-003',
    productId: 'LIG-2847',
    type: 'bulk-ds',
    status: 'released',
    quantity: 40,
    unit: 'kg',
    manufacturingSiteId: 'site-api-ireland',
    manufacturingDate: '2025-10-05',
    expiryDate: '2027-10-04',
    parentBatchIds: ['batch-api-002'],
    childBatchIds: ['batch-dp-eu-001'],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Blend Uniformity': { value: 98.2, spec: '≥95.0%', result: 'pass' },
      'Moisture': { value: 2.0, spec: '≤3.0%', result: 'pass' },
    },
    releaseDate: '2025-10-15',
    releasedBy: 'Siobhan O\'Brien',
  },
  {
    id: 'batch-bulk-004',
    batchNumber: 'BLK-LIG2847-004',
    productId: 'LIG-2847',
    type: 'bulk-ds',
    status: 'quarantine',  // Cascaded from API batch issue
    quantity: 30,
    unit: 'kg',
    manufacturingSiteId: 'site-api-ireland',
    manufacturingDate: '2025-12-10',
    expiryDate: '2027-12-09',
    parentBatchIds: ['batch-api-003'],  // Links to problem batch!
    childBatchIds: ['batch-dp-eu-002'],  // Partially manufactured
    deviationIds: ['DEV-2026-0042'],  // Same deviation
    capaIds: ['CAPA-2026-0015'],
    specifications: {
      'Blend Uniformity': { value: 97.5, spec: '≥95.0%', result: 'pass' },
      'Moisture': { value: 2.2, spec: '≤3.0%', result: 'pass' },
    },
    // Not released - cascaded hold from API batch
  },

  // ===== DRUG PRODUCT BATCHES (Germany for EU, US for domestic) =====
  {
    id: 'batch-dp-us-001',
    batchNumber: 'DP-LIG2847-US-001',
    productId: 'LIG-2847',
    type: 'drug-product',
    status: 'released',
    quantity: 25000,
    unit: 'units',
    manufacturingSiteId: 'site-dp-us',
    manufacturingDate: '2025-10-01',
    expiryDate: '2027-09-30',
    parentBatchIds: ['batch-bulk-001'],
    childBatchIds: ['batch-pkg-us-001'],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Dissolution': { value: 92, spec: '≥80% at 30min', result: 'pass' },
      'Hardness': { value: 8.5, spec: '6-12 kP', result: 'pass' },
      'Weight Variation': { value: 1.2, spec: '≤5%', result: 'pass' },
    },
    releaseDate: '2025-10-15',
    releasedBy: 'Dr. James Chen',
  },
  {
    id: 'batch-dp-us-002',
    batchNumber: 'DP-LIG2847-US-002',
    productId: 'LIG-2847',
    type: 'drug-product',
    status: 'released',
    quantity: 25000,
    unit: 'units',
    manufacturingSiteId: 'site-dp-us',
    manufacturingDate: '2025-10-20',
    expiryDate: '2027-10-19',
    parentBatchIds: ['batch-bulk-002'],
    childBatchIds: ['batch-pkg-us-002'],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Dissolution': { value: 94, spec: '≥80% at 30min', result: 'pass' },
      'Hardness': { value: 7.8, spec: '6-12 kP', result: 'pass' },
      'Weight Variation': { value: 1.0, spec: '≤5%', result: 'pass' },
    },
    releaseDate: '2025-11-01',
    releasedBy: 'Dr. James Chen',
  },
  {
    id: 'batch-dp-eu-001',
    batchNumber: 'DP-LIG2847-EU-001',
    productId: 'LIG-2847',
    type: 'drug-product',
    status: 'released',
    quantity: 20000,
    unit: 'units',
    manufacturingSiteId: 'site-dp-germany',
    manufacturingDate: '2025-11-01',
    expiryDate: '2027-10-31',
    parentBatchIds: ['batch-bulk-003'],
    childBatchIds: ['batch-pkg-eu-001'],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Dissolution': { value: 91, spec: '≥80% at 30min', result: 'pass' },
      'Hardness': { value: 8.0, spec: '6-12 kP', result: 'pass' },
      'Weight Variation': { value: 1.5, spec: '≤5%', result: 'pass' },
    },
    releaseDate: '2025-11-15',
    releasedBy: 'Dr. Hans Mueller',
  },
  {
    id: 'batch-dp-eu-002',
    batchNumber: 'DP-LIG2847-EU-002',
    productId: 'LIG-2847',
    type: 'drug-product',
    status: 'quarantine',  // Cascaded hold!
    quantity: 18000,
    unit: 'units',
    manufacturingSiteId: 'site-dp-germany',
    manufacturingDate: '2025-12-20',
    expiryDate: '2027-12-19',
    parentBatchIds: ['batch-bulk-004'],  // Uses the held bulk
    childBatchIds: [],  // Not packaged yet
    deviationIds: ['DEV-2026-0042'],
    capaIds: ['CAPA-2026-0015'],
    specifications: {
      'Dissolution': { value: 93, spec: '≥80% at 30min', result: 'pass' },
      'Hardness': { value: 7.5, spec: '6-12 kP', result: 'pass' },
      'Weight Variation': { value: 1.3, spec: '≤5%', result: 'pass' },
    },
    // Not released - cascaded hold
  },

  // ===== PACKAGED BATCHES =====
  {
    id: 'batch-pkg-us-001',
    batchNumber: 'PKG-LIG2847-US-001',
    productId: 'LIG-2847',
    type: 'packaged',
    status: 'released',
    quantity: 25000,
    unit: 'units',
    manufacturingSiteId: 'site-dp-us',
    manufacturingDate: '2025-10-20',
    expiryDate: '2027-09-30',
    parentBatchIds: ['batch-dp-us-001'],
    childBatchIds: [],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Label Verification': { value: 100, spec: '100%', result: 'pass' },
      'Seal Integrity': { value: 100, spec: '100%', result: 'pass' },
    },
    releaseDate: '2025-10-25',
    releasedBy: 'Maria Garcia',
  },
  {
    id: 'batch-pkg-us-002',
    batchNumber: 'PKG-LIG2847-US-002',
    productId: 'LIG-2847',
    type: 'packaged',
    status: 'released',
    quantity: 25000,
    unit: 'units',
    manufacturingSiteId: 'site-dp-us',
    manufacturingDate: '2025-11-05',
    expiryDate: '2027-10-19',
    parentBatchIds: ['batch-dp-us-002'],
    childBatchIds: [],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Label Verification': { value: 100, spec: '100%', result: 'pass' },
      'Seal Integrity': { value: 100, spec: '100%', result: 'pass' },
    },
    releaseDate: '2025-11-10',
    releasedBy: 'Maria Garcia',
  },
  {
    id: 'batch-pkg-eu-001',
    batchNumber: 'PKG-LIG2847-EU-001',
    productId: 'LIG-2847',
    type: 'packaged',
    status: 'released',
    quantity: 18000,
    unit: 'units',
    manufacturingSiteId: 'site-pack-belgium',
    manufacturingDate: '2025-11-20',
    expiryDate: '2027-10-31',
    parentBatchIds: ['batch-dp-eu-001'],
    childBatchIds: [],
    deviationIds: [],
    capaIds: [],
    specifications: {
      'Label Verification': { value: 100, spec: '100%', result: 'pass' },
      'Seal Integrity': { value: 100, spec: '100%', result: 'pass' },
      'Serialization': { value: 100, spec: '100%', result: 'pass' },
    },
    releaseDate: '2025-11-25',
    releasedBy: 'Jan Van Damme',
  },
];

// ============================================================================
// IMPACT ANALYSIS DEMO DATA (v0.4.1)
// ============================================================================
// Pre-calculated impact analysis for the DS-LIG2847-003 crisis

export const nexavantImpactAnalysis: ImpactAnalysis = {
  sourceEntityId: 'batch-api-003',
  sourceEntityType: 'batch',
  sourceDescription: 'API Batch DS-LIG2847-003 - Impurity A OOS (0.18% vs ≤0.15%)',
  analysisTimestamp: '2026-01-02T11:00:00Z',
  upstreamImpacts: [
    {
      entityId: 'site-api-india',
      entityType: 'batch',
      name: 'Pharma Synth India - Raw Material Lot RM-2025-1120',
      status: 'at-risk',
      impact: 'indirect',
      description: 'Raw material lot under investigation for potential contribution to impurity',
      depth: 1,
    },
  ],
  downstreamImpacts: [
    {
      entityId: 'batch-bulk-004',
      entityType: 'batch',
      name: 'Bulk Batch BLK-LIG2847-004',
      status: 'affected',
      impact: 'direct',
      description: '30 kg bulk DS manufactured from affected API - now quarantined',
      depth: 1,
    },
    {
      entityId: 'batch-dp-eu-002',
      entityType: 'batch',
      name: 'Drug Product Batch DP-LIG2847-EU-002',
      status: 'affected',
      impact: 'direct',
      description: '18,000 units manufactured from affected bulk - quarantined pending decision',
      depth: 2,
    },
    {
      entityId: 'inv-eu-100-api',
      entityType: 'inventory',
      name: 'EU API Inventory Position',
      status: 'affected',
      impact: 'direct',
      description: '25 kg API quarantined - represents 100% of available EU API inventory',
      depth: 1,
    },
    {
      entityId: 'status-nxv-100-eu',
      entityType: 'sku',
      name: 'Nexavant 100mg EU SKU',
      status: 'affected',
      impact: 'direct',
      description: 'SKU suppliability status changed to RED - 6 weeks supply remaining',
      depth: 3,
    },
    {
      entityId: 'dec-001',
      entityType: 'decision',
      name: 'Batch Disposition Decision DEC-001',
      status: 'affected',
      impact: 'direct',
      description: 'Critical supply decision pending - affects patient supply continuity',
      depth: 3,
    },
    {
      entityId: 'patient-eu-100',
      entityType: 'patient-supply',
      name: 'EU Patient Supply - 100mg',
      status: 'at-risk',
      impact: 'indirect',
      description: 'Approximately 2,500 patients on Nexavant 100mg in EU markets at risk of supply interruption',
      depth: 4,
    },
  ],
  patientImpact: {
    regionsAffected: ['EU'],
    estimatedPatientsAffected: 2500,
    supplyGapWeeks: 4,
  },
  mitigationOptions: [
    'Release batch with scientific justification (Impurity A within toxicological limits)',
    'Expedite production at backup site (Ireland) - 6-8 week lead time',
    'Source from US inventory via parallel import (regulatory complexity)',
    'Notify EMA proactively per Article 23a shortage reporting',
  ],
};

// Helper to get batch type label
export function getBatchTypeLabel(type: BatchType): string {
  switch (type) {
    case 'api': return 'API';
    case 'intermediate': return 'Intermediate';
    case 'bulk-ds': return 'Bulk Drug Substance';
    case 'drug-product': return 'Drug Product';
    case 'packaged': return 'Packaged Product';
    default: return type;
  }
}

// Helper to get batch status color
export function getBatchStatusColor(status: BatchStatus): string {
  switch (status) {
    case 'released': return 'text-green-500';
    case 'in-production': return 'text-blue-500';
    case 'quarantine': return 'text-amber-500';
    case 'rejected': return 'text-red-500';
    case 'expired': return 'text-gray-500';
    case 'recalled': return 'text-red-600';
    default: return 'text-gray-500';
  }
}

export function getBatchStatusBg(status: BatchStatus): string {
  switch (status) {
    case 'released': return 'bg-green-500/10 border-green-500/30';
    case 'in-production': return 'bg-blue-500/10 border-blue-500/30';
    case 'quarantine': return 'bg-amber-500/10 border-amber-500/30';
    case 'rejected': return 'bg-red-500/10 border-red-500/30';
    case 'expired': return 'bg-gray-500/10 border-gray-500/30';
    case 'recalled': return 'bg-red-600/10 border-red-600/30';
    default: return 'bg-gray-500/10 border-gray-500/30';
  }
}

// Get site by ID helper
export function getManufacturingSite(siteId: string): ManufacturingSite | undefined {
  return manufacturingSites.find(s => s.id === siteId);
}

// Get batch by ID helper
export function getBatch(batchId: string): Batch | undefined {
  return nexavantBatches.find(b => b.id === batchId);
}

// Get batch by batch number helper
export function getBatchByNumber(batchNumber: string): Batch | undefined {
  return nexavantBatches.find(b => b.batchNumber === batchNumber);
}

// ============================================================================
// CROSS-MODULE LINKAGE TYPES (v0.4.2)
// ============================================================================

export type ModuleType = 
  | 'batch' 
  | 'deviation' 
  | 'capa' 
  | 'document' 
  | 'submission' 
  | 'trial' 
  | 'safety-case'
  | 'label'
  | 'decision'
  | 'inventory';

export type LinkageType = 
  | 'source'       // This entity caused/triggered the linked entity
  | 'affects'      // This entity impacts/affects the linked entity
  | 'references'   // This entity references/cites the linked entity
  | 'requires'     // This entity requires action from linked entity
  | 'derives-from' // This entity is derived from linked entity
  | 'supersedes';  // This entity replaces/supersedes linked entity

export interface CrossModuleLink {
  id: string;
  sourceEntityId: string;
  sourceEntityType: ModuleType;
  sourceModule: string;
  targetEntityId: string;
  targetEntityType: ModuleType;
  targetModule: string;
  linkageType: LinkageType;
  description: string;
  createdAt: string;
  createdBy: string;
  isAutoGenerated: boolean;
}

export interface EntityConnection {
  entityId: string;
  entityType: ModuleType;
  module: string;
  displayName: string;
  status: string;
  linkageType: LinkageType;
  linkDescription: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface CrossModuleSummary {
  entityId: string;
  entityType: ModuleType;
  connectionsByModule: Record<string, EntityConnection[]>;
  totalConnections: number;
  criticalConnections: number;
  lastUpdated: string;
}

// Module color mapping for visualization
export const MODULE_COLORS: Record<string, string> = {
  'Quality': '#EF4444',      // Red
  'Supply Chain': '#8B5CF6', // Purple
  'Regulatory': '#F59E0B',   // Amber
  'Clinical': '#10B981',     // Green
  'Safety': '#EC4899',       // Pink
  'Manufacturing': '#06B6D4', // Cyan
};

export const ENTITY_TYPE_LABELS: Record<ModuleType, string> = {
  'batch': 'Batch',
  'deviation': 'Deviation',
  'capa': 'CAPA',
  'document': 'Document',
  'submission': 'Submission',
  'trial': 'Clinical Trial',
  'safety-case': 'Safety Case',
  'label': 'Label',
  'decision': 'Decision',
  'inventory': 'Inventory',
};

// ============================================================================
// CROSS-MODULE DEMO DATA (v0.4.2)
// Pre-built connections for the DS-LIG2847-003 contamination scenario
// ============================================================================

export const nexavantCrossModuleLinks: CrossModuleLink[] = [
  // Batch → Deviation link
  {
    id: 'link-001',
    sourceEntityId: 'batch-api-003',
    sourceEntityType: 'batch',
    sourceModule: 'Supply Chain',
    targetEntityId: 'DEV-2026-0042',
    targetEntityType: 'deviation',
    targetModule: 'Quality',
    linkageType: 'source',
    description: 'OOS impurity result triggered deviation investigation',
    createdAt: '2026-01-02T09:15:00Z',
    createdBy: 'System',
    isAutoGenerated: true,
  },
  // Deviation → CAPA link
  {
    id: 'link-002',
    sourceEntityId: 'DEV-2026-0042',
    sourceEntityType: 'deviation',
    sourceModule: 'Quality',
    targetEntityId: 'CAPA-2026-0015',
    targetEntityType: 'capa',
    targetModule: 'Quality',
    linkageType: 'requires',
    description: 'Deviation requires corrective action for process improvement',
    createdAt: '2026-01-02T10:30:00Z',
    createdBy: 'Dr. Sarah Chen',
    isAutoGenerated: false,
  },
  // Batch → Decision link
  {
    id: 'link-003',
    sourceEntityId: 'batch-api-003',
    sourceEntityType: 'batch',
    sourceModule: 'Supply Chain',
    targetEntityId: 'dec-001',
    targetEntityType: 'decision',
    targetModule: 'Supply Chain',
    linkageType: 'requires',
    description: 'Batch requires disposition decision before release',
    createdAt: '2026-01-02T11:00:00Z',
    createdBy: 'System',
    isAutoGenerated: true,
  },
  // Batch → Regulatory Submission link
  {
    id: 'link-004',
    sourceEntityId: 'batch-api-003',
    sourceEntityType: 'batch',
    sourceModule: 'Supply Chain',
    targetEntityId: 'SUB-EU-2026-001',
    targetEntityType: 'submission',
    targetModule: 'Regulatory',
    linkageType: 'affects',
    description: 'Batch deviation may require EMA notification per Article 23a',
    createdAt: '2026-01-02T11:30:00Z',
    createdBy: 'System',
    isAutoGenerated: true,
  },
  // Batch → Document link (Batch Record)
  {
    id: 'link-005',
    sourceEntityId: 'batch-api-003',
    sourceEntityType: 'batch',
    sourceModule: 'Supply Chain',
    targetEntityId: 'DOC-BR-2025-0892',
    targetEntityType: 'document',
    targetModule: 'Quality',
    linkageType: 'references',
    description: 'Linked batch manufacturing record',
    createdAt: '2025-12-15T08:00:00Z',
    createdBy: 'System',
    isAutoGenerated: true,
  },
  // Batch → Safety Case link
  {
    id: 'link-006',
    sourceEntityId: 'batch-api-003',
    sourceEntityType: 'batch',
    sourceModule: 'Supply Chain',
    targetEntityId: 'ICSR-2026-0008',
    targetEntityType: 'safety-case',
    targetModule: 'Safety',
    linkageType: 'affects',
    description: 'Batch under investigation for potential product quality complaint',
    createdAt: '2026-01-02T14:00:00Z',
    createdBy: 'Dr. Maria Lopez',
    isAutoGenerated: false,
  },
  // CAPA → Document link
  {
    id: 'link-007',
    sourceEntityId: 'CAPA-2026-0015',
    sourceEntityType: 'capa',
    sourceModule: 'Quality',
    targetEntityId: 'SOP-MFG-042',
    targetEntityType: 'document',
    targetModule: 'Quality',
    linkageType: 'affects',
    description: 'CAPA requires update to manufacturing SOP',
    createdAt: '2026-01-02T15:00:00Z',
    createdBy: 'Dr. James Wilson',
    isAutoGenerated: false,
  },
  // Deviation → Label link
  {
    id: 'link-008',
    sourceEntityId: 'DEV-2026-0042',
    sourceEntityType: 'deviation',
    sourceModule: 'Quality',
    targetEntityId: 'LBL-NXV-EU-100',
    targetEntityType: 'label',
    targetModule: 'Regulatory',
    linkageType: 'affects',
    description: 'Deviation may require labeling update for storage conditions',
    createdAt: '2026-01-02T16:00:00Z',
    createdBy: 'Dr. Hans Mueller',
    isAutoGenerated: false,
  },
];

// Pre-computed connection summary for batch-api-003 (the problem batch)
export const batchApi003ConnectionSummary: CrossModuleSummary = {
  entityId: 'batch-api-003',
  entityType: 'batch',
  connectionsByModule: {
    'Quality': [
      {
        entityId: 'DEV-2026-0042',
        entityType: 'deviation',
        module: 'Quality',
        displayName: 'DEV-2026-0042: Impurity A OOS',
        status: 'Investigation',
        linkageType: 'source',
        linkDescription: 'OOS result triggered deviation',
        priority: 'critical',
        createdAt: '2026-01-02T09:15:00Z',
      },
      {
        entityId: 'CAPA-2026-0015',
        entityType: 'capa',
        module: 'Quality',
        displayName: 'CAPA-2026-0015: Process Control Enhancement',
        status: 'Open',
        linkageType: 'requires',
        linkDescription: 'Corrective action required',
        priority: 'high',
        createdAt: '2026-01-02T10:30:00Z',
      },
      {
        entityId: 'DOC-BR-2025-0892',
        entityType: 'document',
        module: 'Quality',
        displayName: 'Batch Record DS-LIG2847-003',
        status: 'Under Review',
        linkageType: 'references',
        linkDescription: 'Manufacturing batch record',
        priority: 'medium',
        createdAt: '2025-12-15T08:00:00Z',
      },
    ],
    'Supply Chain': [
      {
        entityId: 'dec-001',
        entityType: 'decision',
        module: 'Supply Chain',
        displayName: 'Batch Disposition Decision',
        status: 'Pending',
        linkageType: 'requires',
        linkDescription: 'Disposition decision required',
        priority: 'critical',
        createdAt: '2026-01-02T11:00:00Z',
      },
    ],
    'Regulatory': [
      {
        entityId: 'SUB-EU-2026-001',
        entityType: 'submission',
        module: 'Regulatory',
        displayName: 'EMA Shortage Notification',
        status: 'Draft',
        linkageType: 'affects',
        linkDescription: 'May require Article 23a notification',
        priority: 'high',
        createdAt: '2026-01-02T11:30:00Z',
      },
      {
        entityId: 'LBL-NXV-EU-100',
        entityType: 'label',
        module: 'Regulatory',
        displayName: 'Nexavant 100mg EU Label',
        status: 'Under Review',
        linkageType: 'affects',
        linkDescription: 'Potential storage condition update',
        priority: 'medium',
        createdAt: '2026-01-02T16:00:00Z',
      },
    ],
    'Safety': [
      {
        entityId: 'ICSR-2026-0008',
        entityType: 'safety-case',
        module: 'Safety',
        displayName: 'PQC Investigation Case',
        status: 'Under Review',
        linkageType: 'affects',
        linkDescription: 'Product quality complaint investigation',
        priority: 'high',
        createdAt: '2026-01-02T14:00:00Z',
      },
    ],
  },
  totalConnections: 7,
  criticalConnections: 2,
  lastUpdated: '2026-01-02T16:00:00Z',
};

// Helper to get connections for an entity
export function getEntityConnections(entityId: string): CrossModuleSummary | null {
  if (entityId === 'batch-api-003') {
    return batchApi003ConnectionSummary;
  }
  // Return null for entities without pre-built connections
  return null;
}

// Helper to get module color
export function getModuleColor(module: string): string {
  return MODULE_COLORS[module] || '#6B7280';
}

// Helper to get entity type label
export function getEntityTypeLabel(type: ModuleType): string {
  return ENTITY_TYPE_LABELS[type] || type;
}

// Helper to get priority color
export function getPriorityColor(priority: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'critical': return 'text-red-500';
    case 'high': return 'text-amber-500';
    case 'medium': return 'text-blue-500';
    case 'low': return 'text-gray-500';
    default: return 'text-gray-500';
  }
}

export function getPriorityBg(priority: 'critical' | 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'critical': return 'bg-red-500/10 border-red-500/30';
    case 'high': return 'bg-amber-500/10 border-amber-500/30';
    case 'medium': return 'bg-blue-500/10 border-blue-500/30';
    case 'low': return 'bg-gray-500/10 border-gray-500/30';
    default: return 'bg-gray-500/10 border-gray-500/30';
  }
}

// ============================================================================
// ACTION CENTER DEMO DATA (v0.4.3)
// ============================================================================

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'qa-create-capa',
    type: 'create-capa',
    label: 'Create CAPA',
    description: 'Initiate corrective and preventive action from this deviation',
    icon: 'Shield',
    targetModule: 'Quality',
    requiredFields: ['title', 'description', 'rootCause', 'assignee'],
    autoPopulateFrom: ['deviationId', 'batchNumber', 'issueDescription'],
  },
  {
    id: 'qa-draft-notification',
    type: 'draft-notification',
    label: 'Draft Regulatory Notification',
    description: 'Create EMA Article 23a or FDA shortage notification',
    icon: 'Send',
    targetModule: 'Regulatory',
    requiredFields: ['region', 'notificationType', 'impactSummary'],
    autoPopulateFrom: ['batchNumber', 'productName', 'impactAssessment'],
  },
  {
    id: 'qa-escalate-disposition',
    type: 'escalate-disposition',
    label: 'Escalate to Disposition Committee',
    description: 'Schedule urgent disposition review meeting',
    icon: 'Users',
    targetModule: 'Supply Chain',
    requiredFields: ['urgencyLevel', 'proposedDate'],
    autoPopulateFrom: ['batchNumber', 'issueDescription', 'impactSummary'],
  },
  {
    id: 'qa-schedule-review',
    type: 'schedule-review',
    label: 'Schedule QA Review',
    description: 'Request quality assurance review of batch documentation',
    icon: 'ClipboardCheck',
    targetModule: 'Quality',
    requiredFields: ['reviewType', 'priority', 'deadline'],
    autoPopulateFrom: ['batchNumber', 'documentIds'],
  },
  {
    id: 'qa-request-investigation',
    type: 'request-investigation',
    label: 'Request Investigation',
    description: 'Initiate root cause investigation',
    icon: 'Search',
    targetModule: 'Quality',
    requiredFields: ['investigationType', 'scope', 'assignee'],
    autoPopulateFrom: ['batchNumber', 'deviationId', 'issueDescription'],
  },
  {
    id: 'qa-notify-stakeholder',
    type: 'notify-stakeholder',
    label: 'Notify Stakeholders',
    description: 'Send notification to relevant stakeholders',
    icon: 'Bell',
    targetModule: 'Supply Chain',
    requiredFields: ['stakeholders', 'message', 'urgency'],
    autoPopulateFrom: ['batchNumber', 'issueDescription'],
  },
];

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  'create-capa': 'Create CAPA',
  'draft-notification': 'Draft Notification',
  'escalate-disposition': 'Escalate Disposition',
  'schedule-review': 'Schedule Review',
  'request-investigation': 'Request Investigation',
  'update-label': 'Update Label',
  'initiate-recall': 'Initiate Recall',
  'notify-stakeholder': 'Notify Stakeholder',
};

export const DISPOSITION_LABELS: Record<DispositionDecision, { label: string; color: string; bg: string }> = {
  'release': { label: 'Release', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/30' },
  'reject': { label: 'Reject', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30' },
  'hold': { label: 'Hold', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30' },
  'rework': { label: 'Rework', color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/30' },
  'quarantine': { label: 'Quarantine', color: 'text-purple-500', bg: 'bg-purple-500/10 border-purple-500/30' },
};

// Pre-built actions for the DS-LIG2847-003 batch (demo scenario)
export const batchApi003Actions: BatchAction[] = [
  {
    id: 'action-001',
    batchId: 'batch-api-003',
    actionType: 'create-capa',
    status: 'completed',
    title: 'CAPA Created for Process Control',
    description: 'Initiated CAPA-2026-0015 for process control enhancement',
    targetModule: 'Quality',
    targetEntityId: 'CAPA-2026-0015',
    targetEntityType: 'capa',
    createdAt: '2026-01-02T10:30:00Z',
    createdBy: 'Dr. Sarah Chen',
    completedAt: '2026-01-02T10:35:00Z',
    completedBy: 'Dr. Sarah Chen',
    linkedFromConnectionId: 'link-002',
    resultingEntityId: 'CAPA-2026-0015',
    notes: 'CAPA opened with 30-day target for root cause identification',
  },
  {
    id: 'action-002',
    batchId: 'batch-api-003',
    actionType: 'draft-notification',
    status: 'in-progress',
    title: 'EMA Shortage Notification Draft',
    description: 'Preparing Article 23a notification for potential supply impact',
    targetModule: 'Regulatory',
    targetEntityId: 'SUB-EU-2026-001',
    targetEntityType: 'submission',
    createdAt: '2026-01-02T11:30:00Z',
    createdBy: 'Dr. Hans Mueller',
    linkedFromConnectionId: 'link-004',
    notes: 'Awaiting disposition decision before finalizing',
  },
  {
    id: 'action-003',
    batchId: 'batch-api-003',
    actionType: 'request-investigation',
    status: 'completed',
    title: 'Root Cause Investigation Initiated',
    description: 'Lab investigation for impurity source identification',
    targetModule: 'Quality',
    targetEntityId: 'INV-2026-0023',
    targetEntityType: 'investigation',
    createdAt: '2026-01-02T09:45:00Z',
    createdBy: 'Dr. James Wilson',
    completedAt: '2026-01-02T15:00:00Z',
    completedBy: 'Dr. James Wilson',
    resultingEntityId: 'INV-2026-0023',
    notes: 'Investigation found temperature excursion during synthesis',
  },
];

// Disposition workflow for the problem batch
export const batchApi003DispositionWorkflow: DispositionWorkflow = {
  id: 'disp-001',
  batchId: 'batch-api-003',
  batchNumber: 'DS-LIG2847-003',
  currentStatus: 'pending-decision',
  requiredApprovers: ['QA Director', 'RA Director', 'Supply Chain Head'],
  approvals: [
    {
      id: 'approval-001',
      role: 'QA Director',
      approverName: 'Dr. Sarah Chen',
      status: 'approved',
      timestamp: '2026-01-02T14:00:00Z',
      comments: 'Investigation complete. Impurity within acceptable limits with justification.',
    },
    {
      id: 'approval-002',
      role: 'RA Director',
      approverName: 'Dr. Hans Mueller',
      status: 'pending',
      comments: undefined,
    },
    {
      id: 'approval-003',
      role: 'Supply Chain Head',
      approverName: 'Michael Torres',
      status: 'pending',
      comments: undefined,
    },
  ],
  prerequisites: [
    {
      id: 'prereq-001',
      type: 'investigation',
      description: 'Root cause investigation complete',
      status: 'complete',
      linkedEntityId: 'INV-2026-0023',
      completedAt: '2026-01-02T15:00:00Z',
      completedBy: 'Dr. James Wilson',
    },
    {
      id: 'prereq-002',
      type: 'lab-result',
      description: 'Confirmatory impurity testing',
      status: 'complete',
      linkedEntityId: 'LAB-2026-0156',
      completedAt: '2026-01-02T13:00:00Z',
      completedBy: 'Lab Team',
    },
    {
      id: 'prereq-003',
      type: 'document-review',
      description: 'Batch record review',
      status: 'complete',
      linkedEntityId: 'DOC-BR-2025-0892',
      completedAt: '2026-01-02T11:00:00Z',
      completedBy: 'QA Team',
    },
    {
      id: 'prereq-004',
      type: 'regulatory-check',
      description: 'Regulatory impact assessment',
      status: 'pending',
      linkedEntityId: undefined,
    },
  ],
  stakeholderNotifications: [
    {
      id: 'notif-001',
      stakeholderRole: 'Manufacturing Head',
      stakeholderName: 'Robert Kim',
      notificationType: 'system',
      status: 'acknowledged',
      sentAt: '2026-01-02T09:30:00Z',
      acknowledgedAt: '2026-01-02T09:45:00Z',
    },
    {
      id: 'notif-002',
      stakeholderRole: 'Commercial Lead',
      stakeholderName: 'Jennifer Adams',
      notificationType: 'email',
      status: 'sent',
      sentAt: '2026-01-02T10:00:00Z',
    },
    {
      id: 'notif-003',
      stakeholderRole: 'EU Affiliate',
      notificationType: 'email',
      status: 'pending',
    },
  ],
  createdAt: '2026-01-02T09:15:00Z',
  createdBy: 'System',
  slaDeadline: '2026-01-05T17:00:00Z',
  isOverdue: false,
};

// Action timeline for the batch
export const batchApi003ActionTimeline: ActionTimelineEntry[] = [
  {
    id: 'timeline-001',
    batchId: 'batch-api-003',
    timestamp: '2026-01-02T09:15:00Z',
    action: 'Deviation Opened',
    actor: 'QC Lab System',
    details: 'OOS result for Impurity A (0.18% vs 0.15% limit) triggered automatic deviation',
    module: 'Quality',
    resultingEntityId: 'DEV-2026-0042',
    resultingEntityType: 'deviation',
  },
  {
    id: 'timeline-002',
    batchId: 'batch-api-003',
    timestamp: '2026-01-02T09:20:00Z',
    action: 'Batch Quarantined',
    actor: 'System',
    details: 'Automatic quarantine per SOP-QA-042',
    module: 'Supply Chain',
  },
  {
    id: 'timeline-003',
    batchId: 'batch-api-003',
    timestamp: '2026-01-02T09:30:00Z',
    action: 'Stakeholders Notified',
    actor: 'System',
    details: 'Manufacturing Head, QA Director notified via system alert',
    module: 'Supply Chain',
  },
  {
    id: 'timeline-004',
    batchId: 'batch-api-003',
    timestamp: '2026-01-02T09:45:00Z',
    action: 'Investigation Initiated',
    actor: 'Dr. James Wilson',
    details: 'Root cause investigation INV-2026-0023 opened',
    actionType: 'request-investigation',
    module: 'Quality',
    resultingEntityId: 'INV-2026-0023',
    resultingEntityType: 'investigation',
  },
  {
    id: 'timeline-005',
    batchId: 'batch-api-003',
    timestamp: '2026-01-02T10:30:00Z',
    action: 'CAPA Created',
    actor: 'Dr. Sarah Chen',
    details: 'CAPA-2026-0015 opened for process control enhancement',
    actionType: 'create-capa',
    module: 'Quality',
    resultingEntityId: 'CAPA-2026-0015',
    resultingEntityType: 'capa',
  },
  {
    id: 'timeline-006',
    batchId: 'batch-api-003',
    timestamp: '2026-01-02T11:30:00Z',
    action: 'Regulatory Notification Drafted',
    actor: 'Dr. Hans Mueller',
    details: 'EMA Article 23a notification draft initiated',
    actionType: 'draft-notification',
    module: 'Regulatory',
    resultingEntityId: 'SUB-EU-2026-001',
    resultingEntityType: 'submission',
  },
  {
    id: 'timeline-007',
    batchId: 'batch-api-003',
    timestamp: '2026-01-02T13:00:00Z',
    action: 'Lab Results Received',
    actor: 'Lab Team',
    details: 'Confirmatory testing confirms impurity at 0.17% - within scientific justification range',
    module: 'Quality',
    resultingEntityId: 'LAB-2026-0156',
    resultingEntityType: 'lab-result',
  },
  {
    id: 'timeline-008',
    batchId: 'batch-api-003',
    timestamp: '2026-01-02T14:00:00Z',
    action: 'QA Director Approval',
    actor: 'Dr. Sarah Chen',
    details: 'Approved release with scientific justification - pending RA and Supply Chain review',
    module: 'Supply Chain',
  },
  {
    id: 'timeline-009',
    batchId: 'batch-api-003',
    timestamp: '2026-01-02T15:00:00Z',
    action: 'Investigation Complete',
    actor: 'Dr. James Wilson',
    details: 'Root cause identified: temperature excursion during synthesis step 3',
    module: 'Quality',
  },
];

// Pending actions queue (items awaiting action across batches)
export const pendingActionsQueue: { batchId: string; batchNumber: string; actionRequired: string; priority: 'critical' | 'high' | 'medium'; slaHours: number; assignee?: string }[] = [
  {
    batchId: 'batch-api-003',
    batchNumber: 'DS-LIG2847-003',
    actionRequired: 'Disposition Decision',
    priority: 'critical',
    slaHours: 24,
    assignee: 'Disposition Committee',
  },
  {
    batchId: 'batch-api-003',
    batchNumber: 'DS-LIG2847-003',
    actionRequired: 'RA Director Approval',
    priority: 'high',
    slaHours: 48,
    assignee: 'Dr. Hans Mueller',
  },
  {
    batchId: 'batch-api-003',
    batchNumber: 'DS-LIG2847-003',
    actionRequired: 'Regulatory Impact Assessment',
    priority: 'high',
    slaHours: 72,
    assignee: 'Regulatory Affairs',
  },
];

// Helper functions for v0.4.3
export function getQuickActionsForConnection(connectionType: ModuleType): QuickAction[] {
  switch (connectionType) {
    case 'deviation':
      return QUICK_ACTIONS.filter(a => ['create-capa', 'request-investigation', 'escalate-disposition'].includes(a.type));
    case 'submission':
      return QUICK_ACTIONS.filter(a => ['draft-notification', 'notify-stakeholder'].includes(a.type));
    case 'safety-case':
      return QUICK_ACTIONS.filter(a => ['request-investigation', 'notify-stakeholder'].includes(a.type));
    case 'capa':
      return QUICK_ACTIONS.filter(a => ['schedule-review', 'notify-stakeholder'].includes(a.type));
    default:
      return QUICK_ACTIONS.filter(a => ['notify-stakeholder', 'escalate-disposition'].includes(a.type));
  }
}

export function getBatchActions(batchId: string): BatchAction[] {
  if (batchId === 'batch-api-003') {
    return batchApi003Actions;
  }
  return [];
}

export function getBatchDispositionWorkflow(batchId: string): DispositionWorkflow | null {
  if (batchId === 'batch-api-003') {
    return batchApi003DispositionWorkflow;
  }
  return null;
}

export function getBatchActionTimeline(batchId: string): ActionTimelineEntry[] {
  if (batchId === 'batch-api-003') {
    return batchApi003ActionTimeline;
  }
  return [];
}

export function getActionTypeLabel(type: ActionType): string {
  return ACTION_TYPE_LABELS[type] || type;
}

export function getDispositionLabel(decision: DispositionDecision): { label: string; color: string; bg: string } {
  return DISPOSITION_LABELS[decision] || { label: decision, color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/30' };
}
