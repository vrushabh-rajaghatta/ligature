

import { useState, useCallback, ReactNode, useId, useEffect } from 'react';
import { Badge, BadgeColor } from './Badge';

/**
 * DetailsTabs - Tabbed interface for organizing complex detail views
 * 
 * Use this to reduce cognitive load by splitting content across tabs.
 * Great for:
 * - Entity detail views with many sections
 * - Settings pages with grouped options
 * - Multi-step workflows showing progress
 * - Complex forms with logical groupings
 */

export interface TabConfig {
  /** Unique tab identifier */
  id: string;
  /** Tab label displayed in the tab bar */
  label: string;
  /** Optional icon to show before label */
  icon?: ReactNode;
  /** Optional badge (e.g., for counts or status) */
  badge?: { text: string; color: BadgeColor };
  /** Tab content */
  content: ReactNode;
  /** Whether tab is disabled */
  disabled?: boolean;
  /** Tooltip for disabled state */
  disabledTooltip?: string;
}

export interface DetailsTabsProps {
  /** Tab configuration array */
  tabs: TabConfig[];
  /** Initially selected tab ID */
  defaultTab?: string;
  /** Visual variant */
  variant?: 'tabs' | 'pills' | 'underline' | 'bordered';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Collapse to accordion on mobile */
  collapseOnMobile?: boolean;
  /** Callback when tab changes */
  onChange?: (tabId: string) => void;
  /** Additional class names */
  className?: string;
  /** Tab bar position */
  position?: 'top' | 'left';
  /** Fill available width for tabs */
  fullWidth?: boolean;
  /** Show content loading indicator */
  loading?: boolean;
  /** Controlled tab value */
  value?: string;
}

const sizeStyles = {
  sm: {
    tab: 'px-3 py-1.5 text-sm',
    icon: 'w-3.5 h-3.5',
    content: 'p-3',
    badge: 'sm' as const,
  },
  md: {
    tab: 'px-4 py-2 text-sm',
    icon: 'w-4 h-4',
    content: 'p-4',
    badge: 'sm' as const,
  },
  lg: {
    tab: 'px-5 py-2.5 text-base',
    icon: 'w-5 h-5',
    content: 'p-5',
    badge: 'md' as const,
  },
};

const variantStyles = {
  tabs: {
    container: 'border-b border-gray-200 dark:border-gray-700',
    tabList: 'flex gap-0',
    tab: {
      base: 'relative border-b-2 border-transparent -mb-px transition-colors',
      active: 'border-blue-500 text-blue-600 dark:text-blue-400',
      inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
      disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
    },
  },
  pills: {
    container: '',
    tabList: 'flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg',
    tab: {
      base: 'rounded-md transition-all',
      active: 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm',
      inactive: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50',
      disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
    },
  },
  underline: {
    container: '',
    tabList: 'flex gap-4 border-b border-gray-200 dark:border-gray-700',
    tab: {
      base: 'relative pb-2 -mb-px border-b-2 border-transparent transition-colors',
      active: 'border-blue-500 text-blue-600 dark:text-blue-400 font-medium',
      inactive: 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
      disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
    },
  },
  bordered: {
    container: 'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
    tabList: 'flex bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
    tab: {
      base: 'border-r border-gray-200 dark:border-gray-700 last:border-r-0 transition-colors',
      active: 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white',
      inactive: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50',
      disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
    },
  },
};

export function DetailsTabs({
  tabs,
  defaultTab,
  variant = 'tabs',
  size = 'md',
  collapseOnMobile = false,
  onChange,
  className = '',
  position = 'top',
  fullWidth = false,
  loading = false,
  value,
}: DetailsTabsProps) {
  const [activeTab, setActiveTab] = useState(value ?? defaultTab ?? tabs[0]?.id);
  const tabPanelId = useId();

  // Sync with controlled value
  useEffect(() => {
    if (value !== undefined) {
      setActiveTab(value);
    }
  }, [value]);

  const handleTabClick = useCallback((tabId: string, disabled?: boolean) => {
    if (disabled) return;
    setActiveTab(tabId);
    onChange?.(tabId);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, tabs: TabConfig[], currentIndex: number) => {
    const enabledTabs = tabs.filter(t => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex(t => t.id === tabs[currentIndex].id);

    let newIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = (currentEnabledIndex + 1) % enabledTabs.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = (currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = enabledTabs.length - 1;
    }

    if (newIndex >= 0 && enabledTabs[newIndex]) {
      handleTabClick(enabledTabs[newIndex].id);
    }
  }, [handleTabClick]);

  const styles = sizeStyles[size];
  const variantStyle = variantStyles[variant];
  const activeContent = tabs.find(t => t.id === activeTab)?.content;

  const isVertical = position === 'left';
  const containerClass = isVertical ? 'flex' : '';
  const tabListClass = isVertical 
    ? 'flex flex-col border-r border-gray-200 dark:border-gray-700 min-w-[180px]'
    : variantStyle.tabList;

  return (
    <div className={`${containerClass} ${className}`}>
      {/* Tab Bar */}
      <div className={variantStyle.container}>
        <div 
          role="tablist"
          aria-orientation={isVertical ? 'vertical' : 'horizontal'}
          className={`${tabListClass} ${fullWidth && !isVertical ? 'w-full' : ''}`}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const tabStyle = tab.disabled 
              ? variantStyle.tab.disabled 
              : isActive 
                ? variantStyle.tab.active 
                : variantStyle.tab.inactive;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tabPanelId}-${tab.id}`}
                aria-disabled={tab.disabled}
                tabIndex={isActive ? 0 : -1}
                onClick={() => handleTabClick(tab.id, tab.disabled)}
                onKeyDown={(e) => handleKeyDown(e, tabs, index)}
                title={tab.disabled ? tab.disabledTooltip : undefined}
                className={`
                  flex items-center justify-center gap-2 font-medium
                  ${styles.tab}
                  ${variantStyle.tab.base}
                  ${tabStyle}
                  ${fullWidth && !isVertical ? 'flex-1' : ''}
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
                `}
              >
                {tab.icon && (
                  <span className={styles.icon}>{tab.icon}</span>
                )}
                <span>{tab.label}</span>
                {tab.badge && (
                  <Badge color={tab.badge.color} size={styles.badge}>
                    {tab.badge.text}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className={`${styles.content} ${isVertical ? 'flex-1' : ''}`}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            id={`${tabPanelId}-${tab.id}`}
            role="tabpanel"
            aria-labelledby={tab.id}
            hidden={activeTab !== tab.id}
            tabIndex={0}
          >
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : (
              activeTab === tab.id && tab.content
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * QuickTabs - Simplified tab component for inline use
 */
export interface QuickTabsProps {
  tabs: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function QuickTabs({
  tabs,
  value,
  onChange,
  size = 'sm',
  className = '',
}: QuickTabsProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5';

  return (
    <div className={`inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            ${sizeClass} rounded-md font-medium transition-all
            ${value === tab.id 
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * StepTabs - Tabs styled as steps for wizard-like flows
 */
export interface StepTabsProps {
  steps: { id: string; label: string; completed?: boolean }[];
  currentStep: string;
  onStepClick?: (stepId: string) => void;
  className?: string;
  allowClickPast?: boolean;
}

export function StepTabs({
  steps,
  currentStep,
  onStepClick,
  className = '',
  allowClickPast = false,
}: StepTabsProps) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isPast = index < currentIndex;
        const isClickable = allowClickPast || isPast || isActive;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick?.(step.id)}
              disabled={!isClickable}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${isActive 
                  ? 'bg-blue-500 text-white' 
                  : isPast 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }
                ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
              `}
            >
              <span className={`
                w-5 h-5 rounded-full flex items-center justify-center text-xs
                ${isActive 
                  ? 'bg-white/20' 
                  : isPast 
                    ? 'bg-green-500/20' 
                    : 'bg-gray-300 dark:bg-gray-700'
                }
              `}>
                {isPast || step.completed ? '✓' : index + 1}
              </span>
              <span>{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className={`
                w-8 h-0.5 mx-1
                ${isPast ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}
              `} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default DetailsTabs;
