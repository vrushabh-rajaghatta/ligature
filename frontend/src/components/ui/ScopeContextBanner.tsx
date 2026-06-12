
/**
 * ScopeContextBanner — v0.125.50
 *
 * Prominent study-context bar shown at the top of scoped module content.
 * The study name is a clearly labelled interactive button that fires
 * `ligature:open-scope` to open the ScopeSelector panel.
 */

import { Crosshair, ChevronDown, ArrowLeftRight } from 'lucide-react';

interface ScopeContextBannerProps {
  scopeFlag: string | null;
  scopeSummary: string | null;
  label?: string;
  filtered?: boolean;
  className?: string;
}

export function ScopeContextBanner({
  scopeFlag,
  scopeSummary,
  label = 'Scope',
  filtered = true,
  className = '',
}: ScopeContextBannerProps) {
  if (!scopeSummary) return null;

  const openScopeSelector = () => {
    document.dispatchEvent(new CustomEvent('ligature:open-scope'));
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 bg-violet-500/8 border-b border-violet-500/20 flex-shrink-0 ${className}`}>
      {/* Label */}
      <div className="flex items-center gap-1.5 text-xs text-violet-400 font-medium flex-shrink-0">
        <Crosshair className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>

      {/* Clickable study selector — styled as a real control */}
      <button
        onClick={openScopeSelector}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 hover:bg-violet-500/20 hover:border-violet-400/60 transition-all group"
        title={`Click to change ${label.toLowerCase()}`}
      >
        {scopeFlag && <span className="text-sm leading-none">{scopeFlag}</span>}
        <span className="text-sm font-semibold text-text-primary group-hover:text-violet-300 transition-colors">
          {scopeSummary}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-violet-400 group-hover:text-violet-300 transition-colors flex-shrink-0" />
      </button>

      {filtered && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 font-medium">
          Filtered
        </span>
      )}

      {/* Explicit change affordance — removes all ambiguity */}
      <button
        onClick={openScopeSelector}
        className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/15 transition-all border border-transparent hover:border-violet-400/30"
      >
        <ArrowLeftRight className="w-3 h-3" />
        <span className="hidden sm:inline">Change {label}</span>
      </button>
    </div>
  );
}
