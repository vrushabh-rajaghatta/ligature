// =============================================================================
// CAPABILITY GATE - Inline action gating for module screens
// =============================================================================
// v0.47.0 - Capability-Level Entitlements
//
// Wraps any action (button, panel, section) with capability checking.
// If the user has the required capability → renders children normally.
// If not → renders a subtle upgrade prompt or disabled state.
//
// Usage:
//   <CapabilityGate moduleId="authoring" capability="approve">
//     <button onClick={handleApprove}>Approve Document</button>
//   </CapabilityGate>
//
// The gate renders children with reduced opacity + overlay when restricted,
// or can render a completely custom fallback.
// =============================================================================


import { type ReactNode } from 'react';
import { Lock, ArrowUpCircle, Eye, Pencil, CheckCircle, Settings, Send } from 'lucide-react';
import { useFeatureFlags } from '@/store/useFeatureFlags';
import {
  type ModuleCapability,
  CAPABILITY_INFO,
  getAccessLevelLabel,
} from '@/config/module-registry';

interface CapabilityGateProps {
  /** The module being gated */
  moduleId: string;
  /** The required capability for this action */
  capability: ModuleCapability;
  /** Content to render when capability is granted */
  children: ReactNode;
  /** Optional custom fallback when capability is denied */
  fallback?: ReactNode;
  /** If true, hides content entirely instead of showing disabled state */
  hide?: boolean;
  /** If true, renders inline (span) instead of block (div) */
  inline?: boolean;
}

const CAPABILITY_ICONS: Record<ModuleCapability, typeof Lock> = {
  view: Eye,
  author: Pencil,
  approve: CheckCircle,
  configure: Settings,
  submit: Send,
};

/**
 * CapabilityGate — wraps actions/UI that require specific capabilities.
 *
 * Three rendering modes:
 * 1. Capability granted → children render normally
 * 2. Capability denied + hide=true → nothing rendered
 * 3. Capability denied → disabled overlay with upgrade hint
 */
export function CapabilityGate({
  moduleId,
  capability,
  children,
  fallback,
  hide = false,
  inline = false,
}: CapabilityGateProps) {
  const hasCapability = useFeatureFlags(s => s.hasCapability);
  const getModuleCaps = useFeatureFlags(s => s.getModuleCaps);
  const enableAll = useFeatureFlags(s => s.enableAll);
  const orgTier = useFeatureFlags(s => s.orgTier);

  // Check if the user has the required capability
  if (hasCapability(moduleId, capability)) {
    return <>{children}</>;
  }

  // If hide mode, render nothing
  if (hide) return null;

  // Custom fallback
  if (fallback) return <>{fallback}</>;

  const caps = getModuleCaps(moduleId);
  const capInfo = CAPABILITY_INFO[capability];
  const accessLabel = getAccessLevelLabel(caps);
  const Icon = CAPABILITY_ICONS[capability];
  const Tag = inline ? 'span' : 'div';

  return (
    <Tag className={`relative ${inline ? 'inline-flex' : ''}`}>
      {/* Disabled children with overlay */}
      <Tag className="pointer-events-none select-none opacity-40 grayscale-[30%]" aria-hidden>
        {children}
      </Tag>

      {/* Upgrade hint overlay */}
      <Tag
        className={`absolute inset-0 flex items-center justify-center ${
          inline ? 'inline-flex' : ''
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (orgTier === 'demo') {
              enableAll();
            }
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg
                     bg-surface-elevated/95 border border-border shadow-sm
                     text-text-secondary hover:text-text-primary hover:border-accent-blue/50
                     transition-colors backdrop-blur-sm"
          title={`Requires ${capInfo?.label ?? ''} capability. Current access: ${accessLabel}`}
        >
          <Lock className="w-3 h-3" />
          <span>{capInfo.label}</span>
          {orgTier === 'demo' && (
            <ArrowUpCircle className="w-3 h-3 text-accent-blue ml-0.5" />
          )}
        </button>
      </Tag>
    </Tag>
  );
}

/**
 * useCapabilityGate — hook version for conditional logic (not rendering).
 *
 * Returns { allowed, caps, accessLabel } for a given module + capability.
 * Use when you need to conditionally execute logic, not just render.
 */
export function useCapabilityGate(moduleId: string, capability: ModuleCapability) {
  const hasCapability = useFeatureFlags(s => s.hasCapability);
  const getModuleCaps = useFeatureFlags(s => s.getModuleCaps);

  const allowed = hasCapability(moduleId, capability);
  const caps = getModuleCaps(moduleId);
  const accessLabel = getAccessLevelLabel(caps);

  return { allowed, caps, accessLabel };
}

/**
 * ViewOnlyBanner — shows a subtle banner at the top of a module when in view-only mode.
 * Drop this into any module screen that should indicate restricted access.
 */
export function ViewOnlyBanner({ moduleId }: { moduleId: string }) {
  const isViewOnly = useFeatureFlags(s => s.isViewOnly);
  const isRestricted = useFeatureFlags(s => s.isRestricted);
  const getModuleCaps = useFeatureFlags(s => s.getModuleCaps);
  const enableAll = useFeatureFlags(s => s.enableAll);
  const orgTier = useFeatureFlags(s => s.orgTier);

  if (!isViewOnly(moduleId) && !isRestricted(moduleId)) return null;

  const caps = getModuleCaps(moduleId);
  const accessLabel = getAccessLevelLabel(caps);
  const viewOnly = isViewOnly(moduleId);

  return (
    <div className={`flex items-center gap-2 px-4 py-2 text-xs border-b ${
      viewOnly
        ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
        : 'bg-blue-500/5 border-blue-500/20 text-blue-400'
    }`}>
      <Eye className="w-3.5 h-3.5 flex-shrink-0" />
      <span>
        {viewOnly
          ? 'You are viewing this module in read-only mode.'
          : `Access level: ${accessLabel}. Some actions may be restricted.`
        }
      </span>
      {orgTier === 'demo' && (
        <button
          onClick={enableAll}
          className="ml-auto text-xs font-medium hover:underline flex items-center gap-1"
        >
          <ArrowUpCircle className="w-3 h-3" />
          Unlock All
        </button>
      )}
    </div>
  );
}
