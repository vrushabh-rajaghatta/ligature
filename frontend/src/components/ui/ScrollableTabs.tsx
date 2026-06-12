// =============================================================================
// ScrollableTabs - v0.43.8
// =============================================================================
// Drop-in horizontally-scrollable tab bar for module screens.
// Handles overflow gracefully on all screen sizes.
//
// USAGE:
// <ScrollableTabs
//   tabs={[
//     { id: 'overview', label: 'Overview', icon: <Eye className="w-4 h-4" /> },
//     { id: 'cases', label: 'Cases', count: 12 },
//   ]}
//   activeTab={activeView}
//   onTabChange={setActiveView}
// />
// =============================================================================


import React, { useRef, useEffect } from 'react';

// Re-export swipe hook for convenient access alongside tabs
export { useSwipeTabHandlers } from '@/hooks/useSwipeTabs';

export interface ScrollableTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
  badge?: {
    value: string | number;
    color: string;
  };
  hidden?: boolean;
}

interface ScrollableTabsProps {
  tabs: ScrollableTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  /** Visual style variant */
  variant?: 'underline' | 'pill';
  /** Active color - defaults to accent-blue */
  activeColor?: string;
  /** Additional className for the container */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

export function ScrollableTabs({
  tabs,
  activeTab,
  onTabChange,
  variant = 'underline',
  activeColor,
  className = '',
  size = 'md',
}: ScrollableTabsProps) {
  const visibleTabs = tabs.filter(t => !t.hidden);
  const containerRef = useRef<HTMLDivElement>(null);
  const py = size === 'sm' ? 'py-2' : 'py-2.5';
  const px = size === 'sm' ? 'px-2.5 sm:px-3' : 'px-3 sm:px-4';
  const textSize = size === 'sm' ? 'text-xs sm:text-sm' : 'text-sm';

  // Auto-scroll to keep active tab visible (e.g. after swipe gesture)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement | null;
    if (!activeBtn) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = activeBtn.getBoundingClientRect();
    // If button is outside visible area, scroll it into view
    if (btnRect.left < containerRect.left || btnRect.right > containerRect.right) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  if (variant === 'pill') {
    return (
      <div ref={containerRef} className={`overflow-x-auto scrollbar-hide ${className}`}>
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-max p-1">
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-1.5 ${px} ${py} ${textSize} font-medium
                  rounded-lg transition-colors whitespace-nowrap flex-shrink-0
                  ${isActive
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'text-text-muted hover:text-text-secondary hover:bg-surface-card/50'
                  }
                `}
                style={isActive && activeColor ? { color: activeColor, backgroundColor: `${activeColor}15` } : undefined}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-accent-blue/20' : 'bg-surface-card'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: underline variant
  return (
    <div ref={containerRef} className={`overflow-x-auto scrollbar-hide -mb-px ${className}`}>
      <div className="flex items-center gap-0.5 sm:gap-1 border-b border-border min-w-max">
        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              data-tab-id={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-1.5 sm:gap-2 ${px} ${py} ${textSize} font-medium
                border-b-2 transition-colors whitespace-nowrap flex-shrink-0
                ${isActive
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-secondary hover:bg-surface-card/50'
                }
              `}
              style={isActive && activeColor ? { color: activeColor, borderColor: activeColor } : undefined}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-accent-blue/10 text-accent-blue' : 'bg-surface-card text-text-muted'
                }`}>
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${tab.badge.color}20`, color: tab.badge.color }}
                >
                  {tab.badge.value}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ScrollableTabs;
