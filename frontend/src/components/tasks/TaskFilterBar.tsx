

/**
 * TaskFilterBar - v0.12.1
 * 
 * Comprehensive filtering interface for the Action Center.
 * Features:
 * - Search input with clear button
 * - Type filter dropdown (HAQ, Safety, QMS, etc.)
 * - Priority filter buttons
 * - Module filter dropdown
 * - Active filter pills with removal
 * - Clear all filters
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, X, Filter, ChevronDown, Check,
  MessageSquare, FileText, ShieldAlert, AlertCircle, AlertTriangle,
  CheckSquare, Target, Tag, FolderOpen, ThumbsUp, PenTool, CheckCircle2
} from 'lucide-react';
import { 
  TASK_TYPE_CONFIG,
  type TaskType,
  type TaskPriority,
  type TaskFilters 
} from '@/store/useTaskAggregationStore';
import type { ModuleId } from '@/types/core';

// Task type icons (duplicated for standalone use)
const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  'haq-response': <MessageSquare className="w-3.5 h-3.5" />,
  'haq-review': <CheckCircle2 className="w-3.5 h-3.5" />,
  'document-review': <FileText className="w-3.5 h-3.5" />,
  'document-signature': <PenTool className="w-3.5 h-3.5" />,
  'safety-signal': <AlertTriangle className="w-3.5 h-3.5" />,
  'safety-case': <ShieldAlert className="w-3.5 h-3.5" />,
  'deviation-response': <AlertCircle className="w-3.5 h-3.5" />,
  'capa-action': <CheckSquare className="w-3.5 h-3.5" />,
  'submission-milestone': <Target className="w-3.5 h-3.5" />,
  'workflow-approval': <ThumbsUp className="w-3.5 h-3.5" />,
  'tmf-artifact': <FolderOpen className="w-3.5 h-3.5" />,
  'labeling-review': <Tag className="w-3.5 h-3.5" />,
};

// Module labels for filter display
const MODULE_LABELS: Record<ModuleId, string> = {
  'haq': 'HAQ Intelligence',
  'safety': 'Safety & PV',
  'qms': 'QMS',
  'authoring': 'Authoring',
  'submissions-hub': 'Submissions',
  'tmf': 'TMF',
  'labeling': 'Labeling',
  'ctms': 'CTMS',
  // Add more as needed
} as Record<ModuleId, string>;

export interface TaskFilterBarProps {
  filters: TaskFilters;
  onFilterChange: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  onClearFilters: () => void;
  /** Total task count (unfiltered) */
  totalCount: number;
  /** Filtered task count */
  filteredCount: number;
  /** Available modules to filter by */
  availableModules?: ModuleId[];
  /** Custom className */
  className?: string;
}

/**
 * Dropdown component for multi-select filters
 */
function FilterDropdown<T extends string>({ 
  label,
  icon,
  options,
  selected,
  onChange,
  getOptionLabel,
  getOptionIcon,
  getOptionColor,
}: {
  label: string;
  icon: React.ReactNode;
  options: T[];
  selected: T[];
  onChange: (selected: T[]) => void;
  getOptionLabel: (option: T) => string;
  getOptionIcon?: (option: T) => React.ReactNode;
  getOptionColor?: (option: T) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: T) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const hasSelection = selected.length > 0;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
          hasSelection
            ? 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
            : 'bg-surface-card border-border text-text-secondary hover:border-border-focus'
        }`}
      >
        {icon}
        <span>{label}</span>
        {hasSelection && (
          <span className="px-1.5 py-0.5 bg-accent-blue text-white text-xs rounded-full">
            {selected.length}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
          {options.map(option => {
            const isSelected = selected.includes(option);
            const optionColor = getOptionColor?.(option);
            
            return (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                  isSelected ? 'bg-accent-blue/10' : 'hover:bg-surface-card'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  isSelected ? 'bg-accent-blue border-accent-blue' : 'border-border'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                {getOptionIcon && (
                  <span style={{ color: optionColor }}>{getOptionIcon(option)}</span>
                )}
                <span className="flex-1 text-text-primary">{getOptionLabel(option)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Priority filter buttons
 */
function PriorityFilter({
  selected,
  onChange,
}: {
  selected: TaskPriority[];
  onChange: (selected: TaskPriority[]) => void;
}) {
  const priorities: TaskPriority[] = ['critical', 'high', 'medium', 'low'];
  
  const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
    critical: { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30' },
    high: { label: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30' },
    medium: { label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    low: { label: 'Low', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30' },
  };

  const togglePriority = (priority: TaskPriority) => {
    if (selected.includes(priority)) {
      onChange(selected.filter(p => p !== priority));
    } else {
      onChange([...selected, priority]);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {priorities.map(priority => {
        const config = priorityConfig[priority];
        const isSelected = selected.includes(priority);
        
        return (
          <button
            key={priority}
            onClick={() => togglePriority(priority)}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isSelected
                ? `${config?.bg ?? ''} ${config?.color ?? ''}`
                : 'bg-surface-card border-border text-text-muted hover:border-border-focus'
            }`}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Active filter pills
 */
function ActiveFilters({
  filters,
  onRemove,
  onClear,
}: {
  filters: TaskFilters;
  onRemove: <K extends keyof TaskFilters>(key: K, value?: string) => void;
  onClear: () => void;
}) {
  const pills: Array<{ key: keyof TaskFilters; value: string; label: string }> = [];

  // Type filters
  filters.types.forEach(type => {
    pills.push({ key: 'types', value: type, label: TASK_TYPE_CONFIG[type].label });
  });

  // Priority filters
  filters.priorities.forEach(priority => {
    pills.push({ key: 'priorities', value: priority, label: `${priority} priority` });
  });

  // Module filters
  filters.modules.forEach(moduleId => {
    pills.push({ key: 'modules', value: moduleId, label: MODULE_LABELS[moduleId] || moduleId });
  });

  // Date range (if not 'all')
  if (filters.dateRange !== 'all') {
    const dateLabels: Record<string, string> = {
      overdue: 'Overdue',
      today: 'Due Today',
      week: 'Due This Week',
      month: 'Due This Month',
    };
    pills.push({ key: 'dateRange', value: filters.dateRange, label: dateLabels[filters.dateRange] });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-text-muted">Active:</span>
      {pills.map((pill, idx) => (
        <button
          key={`${pill.key}-${pill.value}-${idx}`}
          onClick={() => onRemove(pill.key, pill.value)}
          className="flex items-center gap-1.5 px-2 py-1 bg-accent-blue/10 text-accent-blue text-xs rounded-full hover:bg-accent-blue/20 transition-colors"
        >
          {pill.label}
          <X className="w-3 h-3" />
        </button>
      ))}
      <button
        onClick={onClear}
        className="text-xs text-text-muted hover:text-accent-blue transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}

/**
 * TaskFilterBar Component
 */
export function TaskFilterBar({ 
  filters,
  onFilterChange,
  onClearFilters,
  totalCount,
  filteredCount,
  availableModules = ['haq', 'safety', 'qms', 'authoring', 'submissions-hub', 'tmf'],
  className = '',
}: TaskFilterBarProps) {
  // Get available task types (those with config)
  const availableTypes = Object.keys(TASK_TYPE_CONFIG) as TaskType[];

  // Handle removing a specific filter value
  const handleRemoveFilter = <K extends keyof TaskFilters>(key: K, value?: string) => {
    if (key === 'dateRange') {
      onFilterChange('dateRange', 'all');
    } else if (key === 'types' && value) {
      onFilterChange('types', filters.types.filter(t => t !== value));
    } else if (key === 'priorities' && value) {
      onFilterChange('priorities', filters.priorities.filter(p => p !== value));
    } else if (key === 'modules' && value) {
      onFilterChange('modules', filters.modules.filter(m => m !== value));
    }
  };

  const hasActiveFilters = 
    filters.types.length > 0 || 
    filters.priorities.length > 0 || 
    filters.modules.length > 0 || 
    filters.dateRange !== 'all' ||
    filters.search.length > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full bg-surface-card border border-border rounded-lg pl-10 pr-10 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
          />
          {filters.search && (
            <button
              onClick={() => onFilterChange('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
            </button>
          )}
        </div>

        {/* Type filter dropdown */}
        <FilterDropdown
          label="Type"
          icon={<Filter className="w-4 h-4" />}
          options={availableTypes}
          selected={filters.types}
          onChange={(types) => onFilterChange('types', types)}
          getOptionLabel={(type) => TASK_TYPE_CONFIG[type].label}
          getOptionIcon={(type) => TYPE_ICONS[type]}
          getOptionColor={(type) => TASK_TYPE_CONFIG[type].color}
        />

        {/* Priority filter */}
        <PriorityFilter
          selected={filters.priorities}
          onChange={(priorities) => onFilterChange('priorities', priorities)}
        />

        {/* Result count */}
        <div className="text-sm text-text-muted ml-auto">
          {filteredCount === totalCount 
            ? `${totalCount} tasks`
            : `${filteredCount} of ${totalCount} tasks`
          }
        </div>
      </div>

      {/* Active filter pills */}
      <ActiveFilters
        filters={filters}
        onRemove={handleRemoveFilter}
        onClear={onClearFilters}
      />
    </div>
  );
}

export default TaskFilterBar;
