
// =============================================================================
// MODULE REGISTRY - Feature flags, bundle tiers, and capability entitlements
// =============================================================================
// v0.45.1 - Feature Flags Foundation
// v0.47.0 - Capability-Level Entitlements
//
// Maps every sidebar ModuleId to a commercial bundle tier AND a set of
// capabilities. The capability model allows enterprise-flexible licensing:
//   - "All modules, authoring only" → every module gets view + author
//   - "Full regulatory, view-only clinical" → tier-level capability control
//   - Per-module overrides for custom contracts
//
// Integration points:
//   - useFeatureFlags store: hasCapability(moduleId, capability)
//   - Sidebar.tsx: dim vs lock vs full based on capabilities
//   - page.tsx: render restricted mode vs locked screen
//   - CapabilityGate: inline action gating in module screens
// =============================================================================

import { ModuleId } from '@/types/core';

// ── Module Capabilities ──
// Each capability represents a class of actions within a module.
// Capabilities are hierarchical: higher capabilities imply lower ones.
// Order: view < author < approve < configure < submit
export type ModuleCapability =
  | 'view'       // See module data, dashboards, reports (read-only)
  | 'author'     // Create and edit content (documents, cases, studies)
  | 'approve'    // Review, sign, approve workflows (21 CFR Part 11)
  | 'configure'  // Change settings, rules, workflows, templates
  | 'submit';    // Export, publish, submit to regulatory authorities

// All capabilities in hierarchical order (lowest to highest)
export const CAPABILITY_HIERARCHY: ModuleCapability[] = [
  'view', 'author', 'approve', 'configure', 'submit',
];

// Capability display metadata
export const CAPABILITY_INFO: Record<ModuleCapability, { label: string; description: string; icon: string }> = {
  view:      { label: 'View',      description: 'View data, dashboards, and reports',        icon: 'Eye' },
  author:    { label: 'Author',    description: 'Create and edit documents and records',      icon: 'Pencil' },
  approve:   { label: 'Approve',   description: 'Review, sign, and approve workflows',       icon: 'CheckCircle' },
  configure: { label: 'Configure', description: 'Manage settings, rules, and templates',     icon: 'Settings' },
  submit:    { label: 'Submit',    description: 'Export and submit to regulatory authorities', icon: 'Send' },
};

// Full capability set (shorthand for granting everything)
export const ALL_CAPABILITIES: ModuleCapability[] = ['view', 'author', 'approve', 'configure', 'submit'];

// ── Bundle Tiers ──
export type BundleTier =
  | 'core'
  | 'regulatory'
  | 'clinical'
  | 'safety'
  | 'quality'
  | 'cmc'
  | 'research';

// ── Org Subscription Tiers ──
export type OrgTier = 'starter' | 'professional' | 'enterprise' | 'demo';

// ── Bundle Tier Metadata ──
export interface BundleTierInfo {
  id: BundleTier;
  name: string;
  tagline: string;
  color: string;       // Tailwind bg class
  textColor: string;   // Tailwind text class
  borderColor: string; // Tailwind border class
  iconBg: string;      // Tailwind bg for icon circle
}

export const BUNDLE_TIERS: Record<BundleTier, BundleTierInfo> = {
  core: {
    id: 'core',
    name: 'Ligature Core',
    tagline: 'The connected foundation every R&D org needs',
    color: 'bg-teal-500/10',
    textColor: 'text-teal-400',
    borderColor: 'border-teal-500/30',
    iconBg: 'bg-teal-500/20',
  },
  regulatory: {
    id: 'regulatory',
    name: 'Regulatory & Submissions',
    tagline: 'End-to-end regulatory lifecycle from HAQ to eCTD',
    color: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20',
  },
  clinical: {
    id: 'clinical',
    name: 'Clinical Operations',
    tagline: 'From protocol design through database lock',
    color: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/20',
  },
  safety: {
    id: 'safety',
    name: 'Safety & Pharmacovigilance',
    tagline: 'Signal detection to CAPA to label update in one flow',
    color: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    iconBg: 'bg-red-500/20',
  },
  quality: {
    id: 'quality',
    name: 'Quality & Compliance',
    tagline: 'Integrated quality system with regulatory traceability',
    color: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    iconBg: 'bg-amber-500/20',
  },
  cmc: {
    id: 'cmc',
    name: 'CMC & Manufacturing',
    tagline: 'Chemistry, manufacturing, and supply chain',
    color: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    iconBg: 'bg-purple-500/20',
  },
  research: {
    id: 'research',
    name: 'Research & Medical',
    tagline: 'Early-stage R&D and medical affairs',
    color: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/30',
    iconBg: 'bg-indigo-500/20',
  },
};

// ── Module → Bundle Tier Mapping ──
// Every ModuleId that appears in Sidebar navSections is mapped here.
// Core modules are always available; other tiers can be gated.
export const MODULE_TIER_MAP: Partial<Record<ModuleId, BundleTier>> = {
  // ═══ CORE (always available) ═══
  'home': 'core',
  'action-center': 'core',
  'portfolio': 'core',
  'authoring': 'core',
  'document-control': 'core',
  'admin': 'core',
  'activity': 'core',
  'agent-hub': 'core',
  // Intel section — part of core platform AI
  'ai-authoring': 'core',
  'ai-consistency': 'core',
  'analytics': 'core',

  // ═══ REGULATORY & SUBMISSIONS ═══
  'submission-command': 'regulatory',
  'submissions-hub': 'regulatory',
  'submissions': 'regulatory',
  'publishing': 'regulatory',
  'ectd-workspace': 'regulatory',
  'ectd-publishing': 'regulatory',
  'publishing-center': 'regulatory',
  'haq': 'regulatory',
  'ectd-intelligence': 'regulatory',
  'labeling': 'regulatory',
  'spl': 'regulatory',
  'strategy': 'regulatory',
  'reg-calendar': 'regulatory',
  'master-data': 'regulatory',
  'continuous-submission': 'regulatory',
  'idmp': 'regulatory',

  // ═══ CLINICAL OPERATIONS ═══
  'study-design': 'clinical',
  'study-startup': 'clinical',
  'ctms': 'clinical',
  'biostats': 'clinical',
  'tmf': 'clinical',
  'study-intel': 'clinical',
  'development': 'clinical',

  // ═══ SAFETY & PHARMACOVIGILANCE ═══
  'safety': 'safety',
  'signal-detection': 'safety',
  'psmf': 'safety',

  // ═══ QUALITY & COMPLIANCE ═══
  'qms': 'quality',
  'quality': 'quality',
  'glp': 'quality',
  'gcp': 'quality',
  'gmp': 'quality',
  'inspector-readiness': 'quality',
  'archives': 'quality',

  // ═══ CMC & MANUFACTURING ═══
  'cmc': 'cmc',
  'cmc-manufacturing': 'cmc',
  'stability': 'cmc',
  'batch-records': 'cmc',
  'manufacturing': 'cmc',
  'supply-chain': 'cmc',
  'sample-management': 'cmc',

  // ═══ RESEARCH & MEDICAL ═══
  'research': 'research',
  'research-lead-opt': 'research',
  'research-translational': 'research',
  'research-targets': 'research',
  'research-preclinical': 'research',
  'research-ind': 'research',
  'research-literature': 'research',
  'research-intelligence': 'research',
  'eln': 'research',
  'nonclinical': 'research',
  'medical-affairs': 'research',
  'commercial': 'research',
  'adpromo': 'research',
};

// ── Module Display Info (for locked screen) ──
export interface ModuleDisplayInfo {
  name: string;
  description: string;
  features: string[];
}

export const MODULE_DISPLAY_INFO: Partial<Record<ModuleId, ModuleDisplayInfo>> = {
  // Regulatory
  'haq': { name: 'HAQ Intelligence', description: 'AI-powered Health Authority Question response lifecycle with multi-role review.', features: ['AI draft generation', 'SME/Lead/QA review workflow', 'Packaging wizard', 'Supabase persistence'] },
  'submission-command': { name: 'Submission Command Center', description: 'Real-time submission tracking with cascade-triggered amendments.', features: ['Submission dashboard', 'Cascade amendment flags', 'Phase progression'] },
  'submissions-hub': { name: 'Submissions Hub', description: 'Regulatory submission lifecycle management.', features: ['Application tracking', 'Content collection', 'Timeline management'] },
  'publishing': { name: 'Publishing', description: 'Unified eCTD workspace for regulatory publishing.', features: ['Sequence builder', 'Regional templates', 'Document slot management'] },
  'ectd-intelligence': { name: 'eCTD Intelligence', description: 'Submission analytics and document-to-data extraction.', features: ['Submission analytics', 'Document intelligence'] },
  'labeling': { name: 'Global Labeling', description: 'Product labeling, artwork management, and SPL generation.', features: ['Artwork management', 'SKU tracking', 'Translation management'] },
  'spl': { name: 'Structured Product Labeling', description: 'SPL document generation and submission.', features: ['SPL XML generation', 'Label content management'] },
  'strategy': { name: 'Regulatory Strategy', description: 'Regulatory pathway mapping and strategy planning.', features: ['Strategy workspace', 'Pathway mapping'] },
  'master-data': { name: 'Master Data & IDMP', description: 'Master data management and IDMP compliance.', features: ['Data governance', 'IDMP compliance'] },
  'continuous-submission': { name: 'Continuous Submission', description: 'Continuous submission dashboard and tracking.', features: ['Submission pipeline', 'Continuous monitoring'] },
  'reg-calendar': { name: 'Regulatory Calendar', description: 'Regulatory milestone and deadline tracking.', features: ['Calendar views', 'Deadline management'] },

  // Clinical
  'ctms': { name: 'Clinical Trial Management', description: 'Study management with enrollment tracking and DB lock cascade.', features: ['Study management', 'Enrollment tracking', 'DB lock cascade trigger', 'Risk-based monitoring'] },
  'tmf': { name: 'Trial Master File', description: 'TMF zone/artifact management with completeness scoring.', features: ['Zone/artifact structure', 'Completeness scoring', 'Cascade integration'] },
  'study-design': { name: 'Study Design (USDM)', description: 'AI-assisted protocol building with CTMS handoff.', features: ['Protocol builder', 'USDM compliance', 'Study Design → CTMS handoff'] },
  'study-startup': { name: 'Study Startup Orchestrator', description: 'Study startup task orchestration and tracking.', features: ['Startup orchestration', 'Site activation tracking'] },
  'biostats': { name: 'Biostatistics', description: 'Statistical analysis workspace for clinical data.', features: ['SAP management', 'ADaM datasets', 'TLF generation'] },
  'study-intel': { name: 'Study Intelligence', description: 'Clinical study analytics and intelligence.', features: ['Study analytics', 'Enrollment intelligence'] },

  // Safety
  'safety': { name: 'Pharmacovigilance', description: 'Signal detection, case management, and E2B reporting with cross-module cascade.', features: ['Signal detection (PRR)', 'MedDRA coding', 'E2B reporting', 'Cascade engine trigger'] },
  'signal-detection': { name: 'Signal Detection', description: 'Dedicated signal detection and evaluation workspace.', features: ['Signal analytics', 'PRR analysis', 'Class effect detection'] },
  'psmf': { name: 'PSMF', description: 'Pharmacovigilance System Master File management.', features: ['PSMF structure', 'Document assembly'] },

  // Quality
  'qms': { name: 'Quality Management', description: 'CAPA management, deviation tracking with cascade-triggered investigations.', features: ['CAPA management', 'Deviation tracking', 'Safety → CAPA cascade', 'Document workflow'] },
  'glp': { name: 'GLP Compliance', description: 'Good Laboratory Practice compliance management.', features: ['Compliance workspace', 'Audit trails'] },
  'gcp': { name: 'GCP Compliance', description: 'Good Clinical Practice compliance management.', features: ['Compliance workspace', 'Protocol adherence'] },
  'gmp': { name: 'GMP Compliance', description: 'Good Manufacturing Practice compliance management.', features: ['Compliance workspace', 'Batch review'] },
  'inspector-readiness': { name: 'Inspector Readiness', description: 'Inspection preparation and readiness assessment.', features: ['Readiness scoring', 'Mock inspection'] },
  'archives': { name: 'R&D Archives', description: 'Document archive and retrieval.', features: ['Archive browser', 'Document retrieval'] },

  // CMC
  'cmc': { name: 'Chemistry & Manufacturing', description: 'CMC workspace for drug substance and product development.', features: ['Process development', 'Analytical methods', 'Specifications'] },
  'stability': { name: 'Stability Studies', description: 'Stability study management and tracking.', features: ['Study design', 'Data trending'] },
  'batch-records': { name: 'Batch Records', description: 'Electronic batch record management.', features: ['Batch tracking', 'Process documentation'] },
  'supply-chain': { name: 'Supply Chain', description: 'Supply chain coordination and logistics.', features: ['Supply planning', 'Logistics tracking'] },

  // Research & Medical
  'research': { name: 'Research', description: 'Target programs and preclinical study management.', features: ['Target programs', 'Preclinical studies', 'IND readiness'] },
  'eln': { name: 'Electronic Lab Notebook', description: 'Digital lab notebook for research documentation.', features: ['Lab notebook', 'Experiment tracking'] },
  'medical-affairs': { name: 'Medical Affairs', description: 'Medical affairs coordination and scientific communication.', features: ['Medical information', 'Publication planning'] },
  'commercial': { name: 'Launch & Market Access', description: 'Commercial launch and market access planning.', features: ['Launch planning', 'Market access'] },
  'adpromo': { name: 'Ad/Promo Review', description: 'Promotional material review and compliance.', features: ['Review workflow', 'Compliance checking'] },
};

// ── Org Tier → Bundle Access ──
export const ORG_TIER_BUNDLES: Record<OrgTier, BundleTier[]> = {
  starter: ['core'],
  professional: ['core', 'regulatory', 'safety'],
  enterprise: ['core', 'regulatory', 'clinical', 'safety', 'quality', 'cmc', 'research'],
  demo: ['core', 'regulatory', 'clinical', 'safety', 'quality', 'cmc', 'research'],
};

// ── Org Tier → Bundle Tier → Capabilities ──
// Defines what capabilities each bundle tier gets at each org subscription level.
// If a bundle tier is not listed, the module is fully locked (no access).
// This enables "all modules, authoring only" or "full regulatory, view-only clinical".
export type TierCapabilityMap = Partial<Record<BundleTier, ModuleCapability[]>>;

export const ORG_TIER_CAPABILITIES: Record<OrgTier, TierCapabilityMap> = {
  starter: {
    core: ALL_CAPABILITIES,
    // All other tiers: no access (locked)
  },
  professional: {
    core: ALL_CAPABILITIES,
    regulatory: ALL_CAPABILITIES,
    safety: ALL_CAPABILITIES,
    // clinical, quality, cmc, research: view-only for cross-module context
    clinical: ['view'],
    quality: ['view'],
    cmc: ['view'],
    research: ['view'],
  },
  enterprise: {
    core: ALL_CAPABILITIES,
    regulatory: ALL_CAPABILITIES,
    clinical: ALL_CAPABILITIES,
    safety: ALL_CAPABILITIES,
    quality: ALL_CAPABILITIES,
    cmc: ALL_CAPABILITIES,
    research: ALL_CAPABILITIES,
  },
  demo: {
    core: ALL_CAPABILITIES,
    regulatory: ALL_CAPABILITIES,
    clinical: ALL_CAPABILITIES,
    safety: ALL_CAPABILITIES,
    quality: ALL_CAPABILITIES,
    cmc: ALL_CAPABILITIES,
    research: ALL_CAPABILITIES,
  },
};

// ── Demo Preset Configurations ──
// Each preset now includes capability overrides for demo flexibility.
// capabilityOverrides lets you demo "enterprise modules, authoring-only access".
export const DEMO_PRESETS = {
  'core-only': {
    label: 'Core Only',
    description: 'Portfolio, Tasks, Authoring, Doc Control, AI tools',
    tiers: ['core'] as BundleTier[],
    capabilities: {
      core: ALL_CAPABILITIES,
    } as TierCapabilityMap,
  },
  'core-regulatory': {
    label: 'Core + Regulatory',
    description: 'Adds HAQ, Submissions, Publishing, Labeling',
    tiers: ['core', 'regulatory'] as BundleTier[],
    capabilities: {
      core: ALL_CAPABILITIES,
      regulatory: ALL_CAPABILITIES,
    } as TierCapabilityMap,
  },
  'seed-demo': {
    label: 'Seed Demo',
    description: 'Core + Regulatory + Safety — the cascade story',
    tiers: ['core', 'regulatory', 'safety'] as BundleTier[],
    capabilities: {
      core: ALL_CAPABILITIES,
      regulatory: ALL_CAPABILITIES,
      safety: ALL_CAPABILITIES,
    } as TierCapabilityMap,
  },
  'professional': {
    label: 'Professional',
    description: 'Full Reg+Safety, view-only Clinical+Quality+CMC',
    tiers: ['core', 'regulatory', 'clinical', 'safety', 'quality', 'cmc', 'research'] as BundleTier[],
    capabilities: {
      core: ALL_CAPABILITIES,
      regulatory: ALL_CAPABILITIES,
      safety: ALL_CAPABILITIES,
      clinical: ['view'] as ModuleCapability[],
      quality: ['view'] as ModuleCapability[],
      cmc: ['view'] as ModuleCapability[],
      research: ['view'] as ModuleCapability[],
    } as TierCapabilityMap,
  },
  'authoring-only': {
    label: 'Authoring Only',
    description: 'All modules visible, create & edit only — no approvals or submissions',
    tiers: ['core', 'regulatory', 'clinical', 'safety', 'quality', 'cmc', 'research'] as BundleTier[],
    capabilities: {
      core: ['view', 'author'] as ModuleCapability[],
      regulatory: ['view', 'author'] as ModuleCapability[],
      clinical: ['view', 'author'] as ModuleCapability[],
      safety: ['view', 'author'] as ModuleCapability[],
      quality: ['view', 'author'] as ModuleCapability[],
      cmc: ['view', 'author'] as ModuleCapability[],
      research: ['view', 'author'] as ModuleCapability[],
    } as TierCapabilityMap,
  },
  'enterprise': {
    label: 'Enterprise',
    description: 'All modules, all capabilities unlocked',
    tiers: ['core', 'regulatory', 'clinical', 'safety', 'quality', 'cmc', 'research'] as BundleTier[],
    capabilities: {
      core: ALL_CAPABILITIES,
      regulatory: ALL_CAPABILITIES,
      clinical: ALL_CAPABILITIES,
      safety: ALL_CAPABILITIES,
      quality: ALL_CAPABILITIES,
      cmc: ALL_CAPABILITIES,
      research: ALL_CAPABILITIES,
    } as TierCapabilityMap,
  },
} as const;

export type DemoPresetId = keyof typeof DEMO_PRESETS;

// ── Helpers ──

/** Get the tier for a module (defaults to 'core' if unmapped) */
export function getModuleTier(moduleId: ModuleId): BundleTier {
  return MODULE_TIER_MAP[moduleId] ?? 'core';
}

/** Check if a module is enabled for a given set of active tiers */
export function isModuleInTiers(moduleId: ModuleId, activeTiers: BundleTier[]): boolean {
  const tier = getModuleTier(moduleId);
  return activeTiers.includes(tier);
}

/** Get display info for a module (with fallback) */
export function getModuleDisplayInfo(moduleId: ModuleId): ModuleDisplayInfo {
  return MODULE_DISPLAY_INFO[moduleId] ?? {
    name: moduleId,
    description: 'Module not yet configured.',
    features: [],
  };
}

/** Get capabilities for a module given a capability map */
export function getModuleCapabilities(
  moduleId: ModuleId,
  capabilityMap: TierCapabilityMap
): ModuleCapability[] {
  const tier = getModuleTier(moduleId);
  return capabilityMap[tier] ?? [];
}

/** Check if a capability map grants a specific capability to a module */
export function hasModuleCapability(
  moduleId: ModuleId,
  capability: ModuleCapability,
  capabilityMap: TierCapabilityMap
): boolean {
  const caps = getModuleCapabilities(moduleId, capabilityMap);
  return caps.includes(capability);
}

/** Get the access level label for UI display */
export function getAccessLevelLabel(capabilities: ModuleCapability[]): string {
  if (capabilities.length === 0) return 'Locked';
  if (capabilities.length === ALL_CAPABILITIES.length) return 'Full Access';
  if (capabilities.length === 1 && capabilities[0] === 'view') return 'View Only';
  if (capabilities.includes('author') && !capabilities.includes('approve')) return 'Author';
  if (capabilities.includes('approve') && !capabilities.includes('submit')) return 'Review';
  return `${capabilities.length} capabilities`;
}

/** Get the highest capability in a set */
export function getHighestCapability(capabilities: ModuleCapability[]): ModuleCapability | null {
  if (capabilities.length === 0) return null;
  for (let i = CAPABILITY_HIERARCHY.length - 1; i >= 0; i--) {
    if (capabilities.includes(CAPABILITY_HIERARCHY[i])) return CAPABILITY_HIERARCHY[i];
  }
  return null;
}
