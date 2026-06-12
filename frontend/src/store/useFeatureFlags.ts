
// =============================================================================
// FEATURE FLAGS STORE - Module gating and capability-level access control
// =============================================================================
// v0.45.1 - Feature Flags Foundation
// v0.47.0 - Capability-Level Entitlements
//
// Controls module visibility AND per-module capability access.
// Integration points:
//   - Sidebar.tsx: filter nav items via isModuleEnabled(), show restricted state
//   - page.tsx: guard dynamic imports, render restricted/locked screens
//   - CapabilityGate: inline action gating in module screens
//   - Cascade engine: filter steps by target module capabilities
//
// Key upgrade from v0.45.1:
//   - isModuleEnabled() still works (backward compat) — true if ANY capability
//   - NEW: hasCapability(moduleId, capability) for granular action gating
//   - NEW: getModuleCaps(moduleId) returns the capability set
//   - NEW: capabilityMap state tracks per-tier capability assignments
// =============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ModuleId } from '@/types/core';
import {
  type BundleTier,
  type OrgTier,
  type DemoPresetId,
  type ModuleCapability,
  type TierCapabilityMap,
  ALL_CAPABILITIES,
  ORG_TIER_BUNDLES,
  ORG_TIER_CAPABILITIES,
  DEMO_PRESETS,
  getModuleTier,
  getModuleCapabilities,
  hasModuleCapability,
} from '@/config/module-registry';

// ── Types ──
interface FeatureFlagState {
  // State
  activeTiers: BundleTier[];
  orgTier: OrgTier;
  activePreset: DemoPresetId | null;
  capabilityMap: TierCapabilityMap;

  // Selectors (backward compat)
  isModuleEnabled: (moduleId: ModuleId | string) => boolean;
  getModuleTier: (moduleId: ModuleId | string) => BundleTier;

  // Capability selectors (v0.47.0)
  hasCapability: (moduleId: ModuleId | string, capability: ModuleCapability) => boolean;
  getModuleCaps: (moduleId: ModuleId | string) => ModuleCapability[];
  isViewOnly: (moduleId: ModuleId | string) => boolean;
  isRestricted: (moduleId: ModuleId | string) => boolean;

  // Actions
  setOrgTier: (tier: OrgTier) => void;
  applyPreset: (presetId: DemoPresetId) => void;
  setActiveTiers: (tiers: BundleTier[]) => void;
  setCapabilityMap: (map: TierCapabilityMap) => void;
  enableAll: () => void;
}

const ALL_TIERS: BundleTier[] = ['core', 'regulatory', 'clinical', 'safety', 'quality', 'cmc', 'research'];

// Build full capability map (all tiers, all capabilities) for demo/enterprise
function fullCapabilityMap(): TierCapabilityMap {
  const map: TierCapabilityMap = {};
  for (const tier of ALL_TIERS) {
    map[tier] = [...ALL_CAPABILITIES];
  }
  return map;
}

// ── Store ──
export const useFeatureFlags = create<FeatureFlagState>()(
  persist(
    (set, get) => ({
      // Default: demo mode = everything enabled with full capabilities
      activeTiers: [...ALL_TIERS],
      orgTier: 'demo' as OrgTier,
      activePreset: 'enterprise' as DemoPresetId | null,
      capabilityMap: fullCapabilityMap(),

      // ── Backward-compat selectors ──

      isModuleEnabled: (moduleId: ModuleId | string): boolean => {
        // A module is "enabled" if it has ANY capability (including view-only)
        const caps = get().getModuleCaps(moduleId);
        return caps.length > 0;
      },

      getModuleTier: (moduleId: ModuleId | string): BundleTier => {
        return getModuleTier(moduleId as ModuleId);
      },

      // ── Capability selectors ──

      hasCapability: (moduleId: ModuleId | string, capability: ModuleCapability): boolean => {
        return hasModuleCapability(moduleId as ModuleId, capability, get().capabilityMap);
      },

      getModuleCaps: (moduleId: ModuleId | string): ModuleCapability[] => {
        return getModuleCapabilities(moduleId as ModuleId, get().capabilityMap);
      },

      /** True if module has view but NOT author capability */
      isViewOnly: (moduleId: ModuleId | string): boolean => {
        const caps = getModuleCapabilities(moduleId as ModuleId, get().capabilityMap);
        return caps.includes('view') && !caps.includes('author');
      },

      /** True if module is enabled but missing at least one capability */
      isRestricted: (moduleId: ModuleId | string): boolean => {
        const caps = getModuleCapabilities(moduleId as ModuleId, get().capabilityMap);
        return caps.length > 0 && caps.length < ALL_CAPABILITIES.length;
      },

      // ── Actions ──

      setOrgTier: (tier: OrgTier) => {
        const tiers = ORG_TIER_BUNDLES[tier] ?? ALL_TIERS;
        const capMap = ORG_TIER_CAPABILITIES[tier] ?? fullCapabilityMap();
        set({ orgTier: tier, activeTiers: [...tiers], capabilityMap: { ...capMap }, activePreset: null });
      },

      applyPreset: (presetId: DemoPresetId) => {
        const preset = DEMO_PRESETS[presetId];
        if (!preset) return;
        const capMap: TierCapabilityMap = preset.capabilities
          ? { ...preset.capabilities }
          : preset.tiers.reduce((acc, tier) => ({ ...acc, [tier]: [...ALL_CAPABILITIES] }), {} as TierCapabilityMap);
        set({ activeTiers: [...preset.tiers], capabilityMap: capMap, activePreset: presetId });
      },

      setActiveTiers: (tiers: BundleTier[]) => {
        const capMap: TierCapabilityMap = tiers.reduce(
          (acc, tier) => ({ ...acc, [tier]: [...ALL_CAPABILITIES] }), {} as TierCapabilityMap
        );
        set({ activeTiers: [...tiers], capabilityMap: capMap, activePreset: null });
      },

      setCapabilityMap: (map: TierCapabilityMap) => {
        const tiers = (Object.keys(map) as BundleTier[]).filter(t => (map[t]?.length ?? 0) > 0);
        set({ capabilityMap: { ...map }, activeTiers: tiers, activePreset: null });
      },

      enableAll: () => {
        set({
          activeTiers: [...ALL_TIERS],
          capabilityMap: fullCapabilityMap(),
          activePreset: 'enterprise',
        });
      },
    }),
    {
      name: 'ligature-feature-flags',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          const map: TierCapabilityMap = {};
          for (const tier of ALL_TIERS) {
            map[tier] = [...ALL_CAPABILITIES];
          }
          return { ...persisted, capabilityMap: map };
        }
        return persisted;
      },
    }
  )
);

// ── Convenience hooks ──
export const useIsModuleEnabled = (moduleId: ModuleId | string): boolean =>
  useFeatureFlags(state => state.isModuleEnabled(moduleId));

export const useActiveTiers = (): BundleTier[] =>
  useFeatureFlags(state => state.activeTiers);

export const useActivePreset = (): DemoPresetId | null =>
  useFeatureFlags(state => state.activePreset);

export const useHasCapability = (moduleId: ModuleId | string, capability: ModuleCapability): boolean =>
  useFeatureFlags(state => state.hasCapability(moduleId, capability));

export const useModuleCaps = (moduleId: ModuleId | string): ModuleCapability[] =>
  useFeatureFlags(state => state.getModuleCaps(moduleId));

export const useIsViewOnly = (moduleId: ModuleId | string): boolean =>
  useFeatureFlags(state => state.isViewOnly(moduleId));

export const useIsRestricted = (moduleId: ModuleId | string): boolean =>
  useFeatureFlags(state => state.isRestricted(moduleId));
