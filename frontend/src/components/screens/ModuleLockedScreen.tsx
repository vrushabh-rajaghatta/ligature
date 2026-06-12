// =============================================================================
// MODULE LOCKED SCREEN - Shown when user navigates to a fully locked module
// =============================================================================
// v0.45.1 - Feature Flags Foundation
// v0.47.0 - Capability-Level Entitlements (added restricted mode)
//
// Two modes:
//   1. LOCKED (no capabilities): Full lock screen with upgrade CTA
//   2. Module renders normally with ViewOnlyBanner from CapabilityGate
//
// The locked screen now shows capability breakdown and what upgrading unlocks.
// =============================================================================


import { Lock, Sparkles, ChevronRight, Shield, Eye, Pencil, CheckCircle, Settings, Send } from 'lucide-react';
import { ModuleId } from '@/types/core';
import {
  BUNDLE_TIERS,
  CAPABILITY_INFO,
  ALL_CAPABILITIES,
  getModuleTier,
  getModuleDisplayInfo,
  type ModuleCapability,
} from '@/config/module-registry';
import { useFeatureFlags } from '@/store/useFeatureFlags';

const CAPABILITY_ICONS: Record<ModuleCapability, typeof Lock> = {
  view: Eye,
  author: Pencil,
  approve: CheckCircle,
  configure: Settings,
  submit: Send,
};

interface ModuleLockedScreenProps {
  moduleId: ModuleId;
  onNavigateHome?: () => void;
}

export function ModuleLockedScreen({ moduleId, onNavigateHome }: ModuleLockedScreenProps) {
  const tier = getModuleTier(moduleId);
  const tierInfo = BUNDLE_TIERS[tier];
  const displayInfo = getModuleDisplayInfo(moduleId);
  const enableAll = useFeatureFlags(s => s.enableAll);
  const orgTier = useFeatureFlags(s => s.orgTier);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Lock Icon */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 rounded-2xl ${tierInfo.iconBg} flex items-center justify-center`}>
            <Lock className={`w-8 h-8 ${tierInfo.textColor}`} />
          </div>
        </div>

        {/* Module Name */}
        <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
          {displayInfo.name}
        </h1>

        {/* Description */}
        <p className="text-text-muted text-center mb-6 leading-relaxed">
          {displayInfo.description}
        </p>

        {/* Bundle Tier Badge */}
        <div className="flex justify-center mb-6">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${tierInfo?.color ?? ''} ${tierInfo.borderColor} border`}>
            <Shield className={`w-4 h-4 ${tierInfo.textColor}`} />
            <span className={`text-sm font-medium ${tierInfo.textColor}`}>
              Requires {tierInfo.name}
            </span>
          </div>
        </div>

        {/* Capability breakdown */}
        <div className="bg-surface-card border border-border rounded-xl p-5 mb-6">
          <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Capabilities included with {tierInfo.name}
          </h3>
          <div className="space-y-2">
            {ALL_CAPABILITIES.map((cap) => {
              const info = CAPABILITY_INFO[cap];
              const Icon = CAPABILITY_ICONS[cap];
              return (
                <div key={cap} className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${tierInfo.textColor} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-secondary font-medium">{info.label}</span>
                    <span className="text-xs text-text-muted ml-2">{info.description}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature Highlights */}
        {displayInfo.features.length > 0 && (
          <div className="bg-surface-card/50 border border-border/50 rounded-xl p-4 mb-6">
            <h3 className="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">
              Module Features
            </h3>
            <div className="flex flex-wrap gap-2">
              {displayInfo.features.map((feature, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2.5 py-1 text-xs text-text-secondary bg-surface border border-border/50 rounded-lg"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Demo mode: quick unlock */}
          {orgTier === 'demo' && (
            <button
              onClick={enableAll}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${tierInfo?.color ?? ''} ${tierInfo.borderColor} border ${tierInfo.textColor} font-medium text-sm hover:opacity-80 transition-opacity`}
            >
              <Lock className="w-4 h-4" />
              Unlock All Modules (Demo)
            </button>
          )}

          {/* Navigate home */}
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-text-muted hover:text-text-secondary hover:bg-surface-card transition-colors text-sm"
            >
              Back to Portfolio
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Contact prompt for non-demo */}
        {orgTier !== 'demo' && (
          <p className="text-xs text-text-muted text-center mt-6">
            Contact your administrator to upgrade your organization's plan.
          </p>
        )}
      </div>
    </div>
  );
}
