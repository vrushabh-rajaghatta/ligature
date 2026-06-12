// =============================================================================
// TIER SWITCHER - Demo toggle for switching between bundle tier + capability presets
// =============================================================================
// v0.45.1 - Feature Flags Foundation
// v0.47.0 - Capability-Level Entitlements (added capability display per preset)
//
// Discreet control placed in the sidebar bottom section (near version badge).
// Shows a small dropdown to switch between tier presets during demos.
// Only visible in demo mode (orgTier === 'demo').
// Now shows capability scope for each preset (e.g. "View + Author" or "Full Access").
// =============================================================================


import { useState, useRef, useEffect } from 'react';
import { ChevronUp, Check, Layers, Eye, Pencil, Lock } from 'lucide-react';
import { useFeatureFlags } from '@/store/useFeatureFlags';
import {
  DEMO_PRESETS,
  BUNDLE_TIERS,
  ALL_CAPABILITIES,
  type DemoPresetId,
} from '@/config/module-registry';

interface TierSwitcherProps {
  collapsed?: boolean;
}

/** Summarize the capability profile of a preset in a few words */
function getCapabilitySummary(preset: typeof DEMO_PRESETS[DemoPresetId]): string {
  if (!preset.capabilities) return 'Full Access';
  const tierCaps = Object.values(preset.capabilities);
  if (tierCaps.length === 0) return 'No Access';
  // Check if all tiers have full capabilities
  const allFull = tierCaps.every(caps => caps && caps.length === ALL_CAPABILITIES.length);
  if (allFull) return 'Full Access';
  // Check if any tiers are view-only
  const viewOnlyCount = tierCaps.filter(caps => caps && caps.length === 1 && caps[0] === 'view').length;
  const fullCount = tierCaps.filter(caps => caps && caps.length === ALL_CAPABILITIES.length).length;
  if (viewOnlyCount > 0 && fullCount > 0) {
    return `${fullCount} full, ${viewOnlyCount} view-only`;
  }
  // Check if all are author-level
  const allAuthor = tierCaps.every(caps => caps && caps.includes('author') && !caps.includes('approve'));
  if (allAuthor) return 'View + Author';
  return `${tierCaps.length} tiers`;
}

export function TierSwitcher({ collapsed = false }: TierSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const orgTier = useFeatureFlags(s => s.orgTier);
  const activePreset = useFeatureFlags(s => s.activePreset);
  const applyPreset = useFeatureFlags(s => s.applyPreset);
  const activeTiers = useFeatureFlags(s => s.activeTiers);

  // Only show in demo mode
  if (orgTier !== 'demo') return null;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const currentLabel = activePreset ? DEMO_PRESETS[activePreset].label : `${activeTiers.length} tiers`;

  if (collapsed) {
    return (
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-center py-1.5"
        title={`Tier: ${currentLabel}`}
      >
        <Layers className="w-4 h-4 text-amber-500/80" />
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-1.5 px-1 py-1 text-xs text-amber-500/80 hover:text-amber-400 transition-colors rounded"
        title="Switch tier preset for demo"
      >
        <Layers className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{currentLabel}</span>
        <ChevronUp className={`w-3 h-3 ml-auto flex-shrink-0 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-elevated border border-border rounded-lg shadow-xl overflow-hidden z-50" style={{ minWidth: '240px' }}>
          <div className="px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Module Tiers & Capabilities</span>
          </div>
          {(Object.entries(DEMO_PRESETS) as [DemoPresetId, typeof DEMO_PRESETS[DemoPresetId]][]).map(([id, preset]) => {
            const isActive = activePreset === id;
            const capSummary = getCapabilitySummary(preset);
            return (
              <button
                key={id}
                onClick={() => {
                  applyPreset(id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-surface-card'
                    : 'hover:bg-surface-card/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {preset.label}
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 truncate">
                    {preset.description}
                  </div>
                  {/* Tier pills + capability summary */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {preset.tiers.map(tier => {
                      const info = BUNDLE_TIERS[tier];
                      return (
                        <span
                          key={tier}
                          className={`inline-flex px-1.5 py-0.5 text-[10px] rounded ${info?.color ?? ''} ${info.textColor} font-medium`}
                        >
                          {info.name.split(' ')[0]}
                        </span>
                      );
                    })}
                    <span className="text-[10px] text-text-muted/60 ml-1 flex items-center gap-0.5">
                      {capSummary === 'Full Access' ? null : capSummary.includes('view') ? (
                        <Eye className="w-2.5 h-2.5" />
                      ) : capSummary.includes('Author') ? (
                        <Pencil className="w-2.5 h-2.5" />
                      ) : null}
                      {capSummary !== 'Full Access' && capSummary}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
