// =============================================================================
// TABS COMPONENT
// =============================================================================
// Accessible tabs component following WAI-ARIA Tabs Pattern
// =============================================================================


import React, { createContext, useContext, useState, useCallback, useId } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
}

export interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// =============================================================================
// TABS ROOT
// =============================================================================

export function Tabs({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  children,
  className = '',
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const baseId = useId();

  const value = controlledValue ?? uncontrolledValue;

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (controlledValue === undefined) {
        setUncontrolledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [controlledValue, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange, baseId }}>
      <div className={`w-full ${className}`} data-state={value ? 'active' : 'inactive'}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// =============================================================================
// TABS LIST
// =============================================================================

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={`inline-flex h-9 items-center justify-start rounded-lg bg-slate-100 p-1 overflow-x-auto scrollbar-hide max-w-full ${className}`}
    >
      {children}
    </div>
  );
}

// =============================================================================
// TABS TRIGGER
// =============================================================================

export function TabsTrigger({
  value,
  children,
  className = '',
  disabled = false,
}: TabsTriggerProps) {
  const { value: selectedValue, onValueChange, baseId } = useTabsContext();
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-trigger-${value}`}
      aria-controls={`${baseId}-content-${value}`}
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      className={`
        inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1
        text-sm font-medium transition-all
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        disabled:pointer-events-none disabled:opacity-50
        ${
          isSelected
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }
        ${className}
      `}
      data-state={isSelected ? 'active' : 'inactive'}
    >
      {children}
    </button>
  );
}

// =============================================================================
// TABS CONTENT
// =============================================================================

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { value: selectedValue, baseId } = useTabsContext();
  const isSelected = selectedValue === value;

  if (!isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`${baseId}-content-${value}`}
      aria-labelledby={`${baseId}-trigger-${value}`}
      tabIndex={0}
      className={`mt-2 focus-visible:outline-none ${className}`}
      data-state={isSelected ? 'active' : 'inactive'}
    >
      {children}
    </div>
  );
}
